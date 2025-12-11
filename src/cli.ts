#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

// --- parse args ---
const args = process.argv.slice(2);

let userModel = "User"; // default
let force = false;
for (const arg of args) {
    if (arg.startsWith("--user-model=")) {
        userModel = arg.split("=")[1] || "User";
    }
    if (arg === "--force") {
        force = true;
    }
}

const prismaSchemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");

const roleModelBlock = (userModelName: string) => `
model Role {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  ${userModelName.toLowerCase()}Roles ${userModelName}Role[] @relation("TKMU_RoleUsers")
  permissions Permission[] @relation("RolePermissions")
}`;

const permissionModelBlock = `
model Permission {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  roles       Role[]       @relation("RolePermissions")
}`;

// Prisma block dengan nama model user yang dinamik
const pivotModelBlock = (userModelName: string) => `
/// Pivot table untuk many-to-many ${userModelName} <-> Role
model ${userModelName}Role {
  id        Int          @id @default(autoincrement())
  ${userModelName.toLowerCase()}   ${userModelName} @relation("TKMU_UserRoles", fields: [${userModelName.toLowerCase()}Id], references: [id])
  ${userModelName.toLowerCase()}Id Int
  role      Role         @relation("TKMU_RoleUsers", fields: [roleId], references: [id])
  roleId    Int

  @@unique([${userModelName.toLowerCase()}Id, roleId])
}`;

function main() {
    if (!fs.existsSync(prismaSchemaPath)) {
        console.error("❌ prisma/schema.prisma not found. Run this in a Prisma project root.");
        process.exit(1);
    }

    const schema = fs.readFileSync(prismaSchemaPath, "utf8");

    const hasUserModel = new RegExp(`\\bmodel\\s+${userModel}\\s+\\{`).test(schema);
    if (!hasUserModel && !force) {
        console.error(
            `❌ Model "${userModel}" tak jumpa dalam schema.prisma. Guna --user-model=<NamaModel> yang betul atau tambah --force jika pasti.`
        );
        process.exit(1);
    }

    const hasTkmuBlock = schema.includes("TKMU RBAC START");
    const hasRoleModel = /\bmodel\s+Role\s+\{/.test(schema);
    const hasPermissionModel = /\bmodel\s+Permission\s+\{/.test(schema);
    const pivotModelName = `${userModel}Role`;
    const hasPivotModel = new RegExp(`\\bmodel\\s+${pivotModelName}\\s+\\{`).test(schema);

    let workingSchema = schema;
    let addedUserRelation = false;

    // Tambah relation pada model user jika belum ada
    if (hasUserModel) {
        const userModelRegex = new RegExp(`model\\s+${userModel}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
        const match = userModelRegex.exec(workingSchema);
        const userRelationSignature = `@relation("TKMU_UserRoles")`;
        if (match) {
            const body = match[1] ?? "";
            if (!body.includes(userRelationSignature)) {
                const insertion = `  ${userModel.toLowerCase()}Roles ${userModel}Role[] ${userRelationSignature}`;
                const replaced = match[0].replace(/\n\}$/, `\n${insertion}\n}`);
                workingSchema = workingSchema.replace(match[0], replaced);
                addedUserRelation = true;
            }
        }
    }

    if (hasTkmuBlock && !addedUserRelation) {
        console.log("✅ TKMU RBAC block already exists in schema.prisma");
        return;
    }

    if (hasRoleModel && hasPermissionModel && hasPivotModel && addedUserRelation === false) {
        console.log("✅ Role, Permission, pivot, dan relation pada model user sudah wujud dalam schema.prisma");
        return;
    }

    const missingBlocks: string[] = [];

    if (!hasRoleModel) {
        missingBlocks.push(roleModelBlock(userModel));
    }

    if (!hasPermissionModel) {
        missingBlocks.push(permissionModelBlock);
    }

    if (!hasPivotModel) {
        missingBlocks.push(pivotModelBlock(userModel));
    }

    if (missingBlocks.length === 0) {
        if (addedUserRelation) {
            fs.writeFileSync(prismaSchemaPath, workingSchema, "utf8");
            console.log(`✅ Relation pada model "${userModel}" ditambah untuk pivot Role`);
        } else {
            console.log("ℹ️ Tiada perubahan dibuat.");
        }
        return;
    }

    const tkmuBlock = ["/// TKMU RBAC START", ...missingBlocks, "/// TKMU RBAC END"].join("\n\n");

    const newSchema = workingSchema.trimEnd() + "\n\n" + tkmuBlock + "\n";
    fs.writeFileSync(prismaSchemaPath, newSchema, "utf8");

    console.log(
        `✅ TKMU RBAC blok ditambah (${missingBlocks.length} komponen) menggunakan user model "${userModel}"`
    );
    console.log('👉 Sekarang jalankan: npx prisma migrate dev -n "add_tkmu_rbac"');
}

main();
