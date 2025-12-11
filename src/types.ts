export type RoleName = string;
export type PermissionName = string;

export interface UserLike {
  id: string | number;
  roles?: RoleName[];
  permissions?: PermissionName[];
}

export interface PrismaRoleLike {
  [key: string]: unknown;
  name?: RoleName;
}

export interface PrismaPermissionLike {
  [key: string]: unknown;
  name?: PermissionName;
}

export interface PrismaUserInput {
  id: string | number;
  roles?: Array<RoleName | PrismaRoleLike>;
  permissions?: Array<PermissionName | PrismaPermissionLike>;
}

export interface PrismaAdapterOptions {
  roleNameKey?: string;
  permissionNameKey?: string;
}

export interface UserLike {
  id: string | number;
  roles?: RoleName[];
  permissions?: PermissionName[];
}

export interface TkmuOptions {
  /**
   * Enable wildcard permission match, e.g.:
   *  - "users.*" matches "users.view", "users.update"
   *  - "posts.update.*" matches "posts.update.own"
   */
  enableWildcard?: boolean;
}