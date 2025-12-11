#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

// --- parse args ---
const args = process.argv.slice(2);

let userModel = "User"; // default
for (const arg of args) {
    if (arg.startsWith("--user-model=")) {
        userModel = arg.split("=")[1] || "User";
    }
}

const prismaSchemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");

const roleModelBlock = (userModelName: string) => `
model Role {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  ${userModelName.toLowerCase()}Roles ${userModelName}Role[]
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
  ${userModelName.toLowerCase()}   ${userModelName} @relation(fields: [${userModelName.toLowerCase()}Id], references: [id])
  ${userModelName.toLowerCase()}Id Int
  role      Role         @relation(fields: [roleId], references: [id])
  roleId    Int

  @@unique([${userModelName.toLowerCase()}Id, roleId])
}`;

function main() {
    if (!fs.existsSync(prismaSchemaPath)) {
        console.error("❌ prisma/schema.prisma not found. Run this in a Prisma project root.");
        process.exit(1);
    }

    const schema = fs.readFileSync(prismaSchemaPath, "utf8");

    if (schema.includes("TKMU RBAC START")) {
        console.log("✅ TKMU RBAC block already exists in schema.prisma");
        return;
    }

    const hasRoleModel = /\bmodel\s+Role\s+\{/.test(schema);
    const hasPermissionModel = /\bmodel\s+Permission\s+\{/.test(schema);
    const pivotModelName = `${userModel}Role`;
    const hasPivotModel = new RegExp(`\\bmodel\\s+${pivotModelName}\\s+\\{`).test(schema);

    if (hasRoleModel && hasPermissionModel && hasPivotModel) {
        console.log("✅ Role, Permission, dan pivot sudah wujud dalam schema.prisma");
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
        console.log("ℹ️ Tiada perubahan dibuat.");
        return;
    }

    const tkmuBlock = ["/// TKMU RBAC START", ...missingBlocks, "/// TKMU RBAC END"].join("\n\n");

    const newSchema = schema.trimEnd() + "\n\n" + tkmuBlock + "\n";
    fs.writeFileSync(prismaSchemaPath, newSchema, "utf8");

    console.log(
        `✅ TKMU RBAC blok ditambah (${missingBlocks.length} komponen) menggunakan user model "${userModel}"`
    );
    console.log('👉 Sekarang jalankan: npx prisma migrate dev -n "add_tkmu_rbac"');
}

main();
