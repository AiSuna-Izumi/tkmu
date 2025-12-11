// src/tkmu.ts
import type {
  UserLike,
  RoleName,
  PermissionName,
  TkmuOptions,
} from "./types";

const defaultOptions: TkmuOptions = {
  enableWildcard: true,
};

// Util: wildcard match "users.*"
function matchPermission(
  required: PermissionName,
  owned: PermissionName,
  opts: TkmuOptions
): boolean {
  if (!opts.enableWildcard) return required === owned;
  if (required === owned) return true;

  // simple wildcard: "users.*"
  if (required.includes("*")) {
    const base = required.replace(/\*/g, "");
    return owned.startsWith(base);
  }

  return false;
}

/**
 * Check if user has a specific role.
 */
export function hasRole(
  user: UserLike | null | undefined,
  role: RoleName
): boolean {
  if (!user?.roles) return false;
  return user.roles.includes(role);
}

/**
 * Check if user has ANY of the given roles.
 */
export function hasAnyRole(
  user: UserLike | null | undefined,
  roles: RoleName[]
): boolean {
  if (!user?.roles || roles.length === 0) return false;
  return roles.some((r) => user.roles!.includes(r));
}

/**
 * Check if user has ALL of the given roles.
 */
export function hasAllRoles(
  user: UserLike | null | undefined,
  roles: RoleName[]
): boolean {
  if (!user?.roles || roles.length === 0) return false;
  return roles.every((r) => user.roles!.includes(r));
}

/**
 * Check if user has a permission.
 */
export function can(
  user: UserLike | null | undefined,
  permission: PermissionName,
  options: TkmuOptions = {}
): boolean {
  if (!user?.permissions) return false;

  const opts = { ...defaultOptions, ...options };

  return user.permissions.some((p) => matchPermission(permission, p, opts));
}

/**
 * Check if user has ANY of the given permissions.
 */
export function canAny(
  user: UserLike | null | undefined,
  permissions: PermissionName[],
  options: TkmuOptions = {}
): boolean {
  if (!user?.permissions || permissions.length === 0) return false;

  const opts = { ...defaultOptions, ...options };

  return permissions.some((perm) =>
    user.permissions!.some((p) => matchPermission(perm, p, opts))
  );
}

/**
 * Check if user has ALL of the given permissions.
 */
export function canAll(
  user: UserLike | null | undefined,
  permissions: PermissionName[],
  options: TkmuOptions = {}
): boolean {
  if (!user?.permissions || permissions.length === 0) return false;

  const opts = { ...defaultOptions, ...options };

  return permissions.every((perm) =>
    user.permissions!.some((p) => matchPermission(perm, p, opts))
  );
}

/**
 * Small helper to throw 403-style error (boleh guna dalam server-side).
 */
export function assertCan(
  user: UserLike | null | undefined,
  permission: PermissionName,
  options: TkmuOptions = {}
): void {
  if (!can(user, permission, options)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}
