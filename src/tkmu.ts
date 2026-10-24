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
export function matchPermission(
  required: PermissionName,
  owned: PermissionName,
  opts: TkmuOptions
): boolean {
  if (!opts.enableWildcard) return required === owned;
  if (required === owned) return true;

  // Wildcards belong to granted permissions, never to the requested action.
  if (owned.includes("*")) {
    const pattern = owned.split("*").map((part) =>
      part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ).join(".*");
    return new RegExp(`^${pattern}$`).test(required);
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
  if (!user) return false;

  const opts = { ...defaultOptions, ...options };

  return resolvePermissions(user).some((p) => matchPermission(permission, p, opts));
}

/**
 * Check if user has ANY of the given permissions.
 */
export function canAny(
  user: UserLike | null | undefined,
  permissions: PermissionName[],
  options: TkmuOptions = {}
): boolean {
  if (!user || permissions.length === 0) return false;

  const opts = { ...defaultOptions, ...options };

  return permissions.some((perm) =>
    resolvePermissions(user).some((p) => matchPermission(perm, p, opts))
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
  if (!user || permissions.length === 0) return false;

  const opts = { ...defaultOptions, ...options };

  return permissions.every((perm) =>
    resolvePermissions(user).some((p) => matchPermission(perm, p, opts))
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
    throw new AuthorizationError(`Forbidden: missing permission "${permission}"`);
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;
  readonly code = "FORBIDDEN";
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function moduleAccessToPermissions(access: NonNullable<UserLike["moduleAccess"]> = []): PermissionName[] {
  return [...new Set(access.flatMap(({ slug, actions }) =>
    slug ? Object.entries(actions).filter(([, allowed]) => allowed === true)
      .map(([action]) => `${slug}.${action}`) : []
  ))];
}

/** Direct grants and module grants are combined, with duplicates removed. */
export function resolvePermissions(user: UserLike | null | undefined): PermissionName[] {
  return [...new Set([...(user?.permissions ?? []), ...moduleAccessToPermissions(user?.moduleAccess)])];
}

export function checkRole(user: UserLike | null | undefined, role: RoleName): void {
  if (!hasRole(user, role)) throw new AuthorizationError(`Forbidden: missing role "${role}"`);
}
export function checkAnyRole(user: UserLike | null | undefined, roles: RoleName[]): void {
  if (!hasAnyRole(user, roles)) throw new AuthorizationError("Forbidden: missing any required role");
}
export function checkAllRoles(user: UserLike | null | undefined, roles: RoleName[]): void {
  if (!hasAllRoles(user, roles)) throw new AuthorizationError("Forbidden: missing required roles");
}
export const checkPermission = assertCan;
export const hasAllPermissions = canAll;
export const hasAnyPermission = canAny;
export function checkAnyPermission(user: UserLike | null | undefined, permissions: PermissionName[], options: TkmuOptions = {}): void {
  if (!canAny(user, permissions, options)) throw new AuthorizationError("Forbidden: missing any required permission");
}
export function checkAllPermissions(user: UserLike | null | undefined, permissions: PermissionName[], options: TkmuOptions = {}): void {
  if (!canAll(user, permissions, options)) throw new AuthorizationError("Forbidden: missing required permissions");
}
