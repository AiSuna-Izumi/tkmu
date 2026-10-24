#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function main() {
  const args = process.argv.slice(2);
  const option = (key: string, fallback: string) => args.find(arg => arg.startsWith(`--${key}=`))?.slice(key.length + 3) || fallback;
  const userModel = option("user-model", "User");
  const menuModel = option("menu-model", "Menu");
  const menuTable = option("menu-table", "menus");
  const withMenu = args.some(arg => arg === "--with-menu" || arg === "--menu" || arg.startsWith("--menu-model=") || arg.startsWith("--menu-table="));
  for (const name of [userModel, menuModel, menuTable]) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid schema identifier: ${name}`);
  }
  const schemaPath = path.resolve(option("schema", "prisma/schema.prisma"));
  const schema = fs.readFileSync(schemaPath, "utf8");
  const marker = "/// TKMU RBAC V2 START";
  if (schema.includes(marker)) {
    if (withMenu && !new RegExp(`\\bmodel\\s+${menuModel}\\s*\\{`).test(schema)) {
      throw new Error("RBAC already exists. Add the menu relation manually; existing schemas are never overwritten.");
    }
    console.log("TKMU RBAC already exists. No changes made.");
    return;
  }
  const userRegex = new RegExp(`\\bmodel\\s+${userModel}\\s*\\{([^}]*?)\\}`, "m");
  const match = userRegex.exec(schema);
  if (!match) throw new Error(`Model "${userModel}" not found. Create it first or use --user-model=Name.`);
  const id = /^\s*id\s+(Int|String|BigInt)\b([^\n]*)/m.exec(match[1]!);
  if (!id || !/@id\b/.test(id[2]!)) throw new Error("The user model must have a single id field of type Int, String or BigInt.");
  const idType = id[1]!;
  const nativeType = id[2]!.match(/@db\.\w+(?:\([^)]*\))?/)?.[0] ?? "";
  for (const name of ["Role", "Permission", "UserRole", "RolePermission", ...(withMenu ? [menuModel] : [])]) {
    if (name === userModel || new RegExp(`\\bmodel\\s+${name}\\s*\\{`).test(schema)) {
      throw new Error(`Model "${name}" already exists. Merge the RBAC schema manually to preserve existing data.`);
    }
  }
  if (/\buser_roles\s/.test(match[1]!)) throw new Error("User.user_roles already exists. Merge the relation manually.");
  const updated = schema.replace(match[0], match[0].replace(/\}$/, "\n  user_roles UserRole[]\n}"));
  const block = `
${marker}
model Role {
  id Int @id @default(autoincrement())
  name String @unique
  user_roles UserRole[]
  role_permissions RolePermission[]
  @@map("roles")
}
model Permission {
  id Int @id @default(autoincrement())
  name String @unique
  role_permissions RolePermission[]
  ${withMenu ? `menus ${menuModel}[]` : ""}
  @@map("permissions")
}
model UserRole {
  user_id ${idType} ${nativeType}
  role_id Int
  user ${userModel} @relation(fields: [user_id], references: [id], onDelete: Cascade)
  role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)
  @@id([user_id, role_id])
  @@index([role_id])
  @@map("user_roles")
}
model RolePermission {
  role_id Int
  permission_id Int
  role Role @relation(fields: [role_id], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permission_id], references: [id], onDelete: Cascade)
  @@id([role_id, permission_id])
  @@index([permission_id])
  @@map("role_permissions")
}
${withMenu ? `model ${menuModel} {
  id Int @id @default(autoincrement())
  title String
  url String?
  icon String?
  sort Int @default(0)
  status Int @default(1)
  parent_id Int?
  permission_id Int?
  parent ${menuModel}? @relation("MenuHierarchy", fields: [parent_id], references: [id], onDelete: SetNull)
  children ${menuModel}[] @relation("MenuHierarchy")
  permission Permission? @relation(fields: [permission_id], references: [id], onDelete: SetNull)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  @@map("${menuTable}")
}` : ""}
/// TKMU RBAC V2 END
`;
  fs.writeFileSync(`${schemaPath}.tkmu.bak`, schema, { flag: "wx" });
  fs.writeFileSync(schemaPath, updated.trimEnd() + "\n" + block);
  console.log(`RBAC schema added. Backup: ${schemaPath}.tkmu.bak`);
  console.log(`Review the schema, then run: npx prisma migrate dev --schema=${JSON.stringify(schemaPath)} --name add_rbac`);
}
try { main(); } catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
