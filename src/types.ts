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

export interface TkmuOptions {
  /**
   * Enable wildcard permission match, e.g.:
   *  - "users.*" matches "users.view", "users.update"
   *  - "posts.update.*" matches "posts.update.own"
   */
  enableWildcard?: boolean;
}

export interface MenuItem {
  id: string | number;
  title: string;
  url?: string | null;
  icon?: string | null;
  sort?: number | null;
  status?: number | null;
  permission?: PermissionName | null;
  parentId?: string | number | null;
  [key: string]: unknown;
}

export type MenuNode<T extends MenuItem = MenuItem> = T & {
  children: Array<MenuNode<T>>;
};

export interface BuildMenuOptions {
  /**
   * Key name that stores the parent id / children_of id. Default: "parentId".
   */
  parentKey?: string;
  /**
   * Key name that stores the permission name. Default: "permission".
   */
  permissionKey?: string;
  /**
   * Which key to sort by (ascending). Default: "sort".
   */
  sortKey?: string;
  /**
   * Skip menu entries that the user cannot access (default true).
   */
  filterUnauthorized?: boolean;
  /**
   * Extra tkmu permission options (wildcards etc).
   */
  tkmuOptions?: TkmuOptions;
}
