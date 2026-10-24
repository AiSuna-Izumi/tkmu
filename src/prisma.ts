import type { PrismaAdapterOptions, UserLike } from "./types";

type Row = Record<string, unknown>;
const row = (value: unknown): Row => value && typeof value === "object" ? value as Row : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** Normalize direct relations or explicit user_roles / role_permissions pivots.
 * Fetch only active roles and assignments in your Prisma query before calling this.
 */
export function fromPrismaUser(input: unknown, options: PrismaAdapterOptions = {}): UserLike | null {
  if (input == null) return null;
  const source = row(input);
  if (typeof source.id !== "string" && typeof source.id !== "number") {
    throw new TypeError("A Prisma user must have a string or number id");
  }
  const {
    rolesKey = "user_roles", permissionsKey = "permissions",
    roleRelationKey = "role", permissionRelationKey = "permission",
    roleNameKey = "name", permissionNameKey = "name",
    rolePermissionsKey = "role_permissions",
  } = options;
  const roles = new Set<string>();
  const permissions = new Set<string>();
  const addPermission = (value: unknown) => {
    const nested = row(value)[permissionRelationKey] ?? value;
    const name = typeof nested === "string" ? nested : row(nested)[permissionNameKey];
    if (typeof name === "string" && name) permissions.add(name);
  };
  for (const value of list(source[rolesKey] ?? (options.rolesKey ? undefined : source.roles))) {
    const role = row(value)[roleRelationKey] ?? value;
    const name = typeof role === "string" ? role : row(role)[roleNameKey];
    if (typeof name === "string" && name) roles.add(name);
    for (const permission of list(row(role)[rolePermissionsKey] ?? (options.rolePermissionsKey ? undefined : row(role).permissions))) {
      addPermission(permission);
    }
  }
  for (const permission of list(source[permissionsKey])) addPermission(permission);
  return { id: source.id, roles: [...roles], permissions: [...permissions] };
}
