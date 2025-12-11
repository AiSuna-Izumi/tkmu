import type { UserLike, RoleName, PermissionName } from "./types";

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
