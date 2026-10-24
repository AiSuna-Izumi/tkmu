# dztech-tkmu

RBAC helpers for Node.js and Next.js. TypeScript, ESM and CommonJS supported; no runtime dependencies.

## Installation

Install directly from GitHub:

```sh
npm install github:AiSuna-Izumi/tkmu
```

To use a specific published Git tag or commit, append its reference:

```sh
npm install github:AiSuna-Izumi/tkmu#<tag-or-commit>
```

Replace `<tag-or-commit>` with an existing Git reference. The repository's `prepare` script builds the package during installation; Git and Node.js tooling must be available, and lifecycle scripts must be enabled.

Imports use the package name declared in `package.json`, even when installed from GitHub:

```ts
import { can, hasRole } from "dztech-tkmu";
```

If the package is available on your npm registry, you can also install it by name:

```sh
npm install dztech-tkmu
```

Local changes must be pushed to GitHub before GitHub installations can use them. For reproducible installations, pin a commit or release tag.

## Roles, permissions and module access

```ts
import { can, canAll, checkRole, assertCan } from "dztech-tkmu";

const user = {
  id: 1,
  roles: ["editor"],
  permissions: ["reports.*"],
  moduleAccess: [
    { slug: "posts", actions: { view: true, create: true, update: true, delete: false } },
  ],
};

can(user, "reports.export"); // true: granted wildcard
can(user, "posts.view"); // true: module grant
canAll(user, ["posts.create", "posts.update"]); // true
checkRole(user, "editor");
assertCan(user, "posts.delete"); // throws AuthorizationError
```

Direct permissions and module permissions are combined. Module actions accept any English action name, including application actions such as `approve` or `export`. Only actions explicitly set to `true` grant access.

Wildcards apply to **granted** permissions: `users.*` grants `users.view`, while requesting `users.*` does not match a grant of only `users.view`. Matching is case sensitive and anchored; `*` can span multiple segments. Disable wildcard expansion with `{ enableWildcard: false }`.

## Prisma setup

```sh
npx tkmu-prisma --user-model=User --with-menu
# Optional: --schema=prisma/schema.prisma --menu-model=Menu --menu-table=menus
```

The CLI adds `Role`, `Permission`, `UserRole`, and `RolePermission` models mapped to `roles`, `permissions`, `user_roles`, and `role_permissions`. Relation and foreign key fields use English snake_case: `user_roles`, `role_permissions`, `user_id`, `role_id`, `permission_id`. Optional menus use `parent_id`, `created_at`, and `updated_at`.

An existing user model with a single `id` of type `Int`, `String`, or `BigInt` is required. The CLI preserves its native ID annotation, creates a `.tkmu.bak` backup, and refuses conflicting existing models. Review the generated schema before running Prisma migrations. Existing v0.1 schemas require a manual migration; implicit role/permission tables are not automatically converted. `--force` no longer bypasses a missing user model.

```ts
import { fromPrismaUser, can } from "dztech-tkmu";

const dbUser = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    user_roles: {
      include: {
        role: {
          include: { role_permissions: { include: { permission: true } } },
        },
      },
    },
  },
});

const user = fromPrismaUser(dbUser);
can(user, "posts.view");
```

The adapter combines direct user permissions with permissions inherited from roles, removing duplicates. It also accepts flat `roles` / `permissions` arrays and direct `{ name }` relations. `null` input returns `null`; invalid IDs throw `TypeError`. Filter inactive or soft-deleted assignments in your Prisma query.

Custom field options: `rolesKey`, `permissionsKey`, `roleRelationKey`, `permissionRelationKey`, `roleNameKey`, `permissionNameKey`, and `rolePermissionsKey`.

## Next.js session integration

Supply your own session and database lookup. The library does not depend on an auth provider or Prisma runtime.

```ts
// lib/access.ts — server-side application code
import { createPermissionLoader, fromPrismaUser } from "dztech-tkmu";

export const access = createPermissionLoader({
  getUser: async () => {
    const session = await getSession(); // your application's session helper
    if (!session?.user?.id) return null;
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        user_roles: {
          include: {
            role: { include: { role_permissions: { include: { permission: true } } } },
          },
        },
      },
    });
    return fromPrismaUser(dbUser);
  },
  actions: ["view", "create", "update", "delete", "approve"],
});

await access.getPermissionsBySlug("posts");
// { slug: "posts", actions: { view: true, create: false, ... } }
await access.getPermissionsByAnySlug(["posts", "reports"]);
// { slugs: ["posts", "reports"], actions: { ... } } — any slug may grant each action
await access.canAccessBySlug("posts", "view");
await access.assertAccessBySlug("posts", "delete");
```

Default actions are `view`, `create`, `update`, `delete`. Each query loads the current user once; no global user cache is used. Blank slugs deny access. Enforce access in every protected Route Handler or Server Action; hiding frontend controls alone does not protect data.

```ts
// Inside a Next.js Route Handler
import { AuthorizationError } from "dztech-tkmu";
import { access } from "@/lib/access";

export async function DELETE() {
  try {
    await access.assertAccessBySlug("posts", "delete");
    // Perform the authorized operation here.
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
```

## API

- Roles: `hasRole`, `hasAnyRole`, `hasAllRoles`, `checkRole`, `checkAnyRole`, `checkAllRoles`.
- Permissions: `can`, `canAny`, `canAll`, `assertCan` / `checkPermission`, `checkAnyPermission`, `checkAllPermissions`.
- Compatibility aliases: `hasAnyPermission`, `hasAllPermissions`.
- Normalization: `moduleAccessToPermissions`, `resolvePermissions`, `fromPrismaUser`.
- Session integration: `createPermissionLoader`.
- Errors: `AuthorizationError` with `status: 403` and `code: "FORBIDDEN"`.

Boolean checks deny missing users and empty requirement lists. Guards throw `AuthorizationError` when denied.

## Permission-aware menus

```ts
import { buildMenuTree } from "dztech-tkmu";

const menus = await prisma.menu.findMany({ include: { permission: true } });
const tree = buildMenuTree(
  menus.map(menu => ({ ...menu, permission: menu.permission?.name ?? null })),
  user,
  { parentKey: "parent_id" },
);
```

Menus without a permission are public. Unauthorized items are filtered; remaining items whose parents are absent become roots. Sort uses `sort` ascending. Status filtering remains the application's responsibility.

## Upgrade notes

Existing role and permission helper signatures remain available. Wildcard semantics are corrected to expand grants rather than requested permissions. CLI output now uses explicit English pivot tables; existing databases need a reviewed migration. The core never automatically assigns roles, changes organization membership, or writes audit records.

## Development

```sh
npm test
npm run typecheck
npm run build
```
