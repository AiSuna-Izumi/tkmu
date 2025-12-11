export type RoleName = string;
export type PermissionName = string;

export interface UserLike {
  id: string | number;
  roles?: RoleName[];
  permissions?: PermissionName[];
}
