
---

## tkmu (English)
Tiny Spatie-like RBAC helper for Node/Next.js with a small API.

### Quick steps
1) Install
```sh
npm install dztech-tkmu
# or
yarn add dztech-tkmu
```
2) Prepare a user object with `roles` and/or `permissions` arrays.
3) Call the helpers in middleware, API routes, or server components.

### Quick example
```ts
import { hasRole, hasAnyRole, can, hasAllPermissions } from "dztech-tkmu";

const user = {
  id: 123,
  roles: ["admin", "editor"],
  permissions: ["posts.create", "posts.publish"],
};

if (hasRole(user, "admin")) {
  console.log("Admin can enter");
}

if (hasAnyRole(user, ["author", "editor"])) {
  console.log("Has a matching role");
}

if (can(user, "posts.create")) {
  console.log("Can create posts");
}

if (hasAllPermissions(user, ["posts.create", "posts.publish"])) {
  console.log("Fully allowed to publish");
}
```

### API
- `hasRole(user, role)` → `boolean`
- `hasAnyRole(user, roles[])` → `boolean`
- `can(user, permission)` → `boolean`
- `hasAllPermissions(user, permissions[])` → `boolean`

TypeScript is fully supported (`UserLike`, `RoleName`, `PermissionName`).

### Notes
- Outputs for ESM (`dist/index.mjs`) and CJS (`dist/index.cjs`).
- Target runtime `es2020`; no runtime deps.

### Prisma integration (auto setup)
1) Run the CLI to insert Role/Permission/pivot models if missing:
```sh
npx tkmu-prisma --user-model=User
# target file: prisma/schema.prisma
# CLI will try to add the relation on your user model (UserRole[]) if missing
# use --force if your User model isn’t present yet but you want the block added
```
2) Ensure your Prisma models have `roles`/`permissions` relations with a `name` field (or your own field names).
3) Fetch a user with those relations included.
4) Use `fromPrismaUser` to normalize into `UserLike` for the helpers.

```ts
import { fromPrismaUser, hasRole, can } from "dztech-tkmu";
import { prisma } from "./prisma";

const dbUser = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    roles: true,          // [{ name: "admin" }]
    permissions: true,    // [{ name: "posts.create" }]
  },
});

const user = fromPrismaUser(dbUser); // auto extract name -> roles/permissions

if (hasRole(user, "admin") && can(user, "posts.create")) {
  // do something
}

// If your fields differ, pass custom keys
const userCustom = fromPrismaUser(dbUser, {
  roleNameKey: "roleName",
  permissionNameKey: "code",
});
```
