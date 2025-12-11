import type {
  UserLike,
  RoleName,
  PermissionName,
  PrismaUserInput,
  PrismaAdapterOptions,
} from "./types";

export function hasRole(user: UserLike | null | undefined, role: RoleName): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(role);
}

export function can(user: UserLike | null | undefined, permission: PermissionName): boolean {
  if (!user?.permissions) return false;
  return user.permissions.includes(permission);
}

export function hasAnyRole(user: UserLike | null | undefined, roles: RoleName[]): boolean {
  if (!user?.roles) return false;
  return roles.some((r) => user.roles!.includes(r));
}

export function hasAllPermissions(
  user: UserLike | null | undefined,
  permissions: PermissionName[]
): boolean {
  if (!user?.permissions) return false;
  return permissions.every((p) => user.permissions!.includes(p));
}

export function fromPrismaUser(
  user: PrismaUserInput | null | undefined,
  options?: PrismaAdapterOptions
): UserLike | null {
  if (!user) return null;

  const roleNameKey = options?.roleNameKey ?? "name";
  const permissionNameKey = options?.permissionNameKey ?? "name";

  const roles = Array.isArray(user.roles)
    ? user.roles
        .map((role) => (typeof role === "string" ? role : (role as Record<string, unknown>)[roleNameKey]))
        .filter((r): r is RoleName => typeof r === "string" && r.length > 0)
    : undefined;

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
        .map((permission) =>
          typeof permission === "string" ? permission : (permission as Record<string, unknown>)[permissionNameKey]
        )
        .filter((p): p is PermissionName => typeof p === "string" && p.length > 0)
    : undefined;

  const normalized: UserLike = { id: user.id };

  if (roles && roles.length > 0) {
    normalized.roles = roles;
  }

  if (permissions && permissions.length > 0) {
    normalized.permissions = permissions;
  }

  return normalized;
}
