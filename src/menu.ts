import { can } from "./tkmu";
import type {
  BuildMenuOptions,
  MenuItem,
  MenuNode,
  PermissionName,
  UserLike,
} from "./types";

/**
 * Bina menu tree (ala binary tree) daripada senarai rata.
 * Boleh auto tapis ikut permission nama (string) jika user diberi.
 */
export function buildMenuTree<T extends MenuItem>(
  items: T[],
  user?: UserLike | null,
  options: BuildMenuOptions = {}
): Array<MenuNode<T>> {
  const {
    parentKey = "parentId",
    permissionKey = "permission",
    sortKey = "sort",
    filterUnauthorized = true,
    tkmuOptions,
  } = options;

  const filtered = items
    .map<MenuNode<T>>((item) => ({ ...item, children: [] }))
    .filter((item) => {
      if (!filterUnauthorized) return true;
      const permission = (item as Record<string, unknown>)[permissionKey] as
        | PermissionName
        | null
        | undefined;
      if (!permission) return true;
      if (!user) return false;
      return can(user, permission, tkmuOptions);
    });

  const lookup = new Map<string | number, MenuNode<T>>();
  for (const item of filtered) {
    lookup.set(item.id, item);
  }

  const roots: Array<MenuNode<T>> = [];

  for (const node of filtered) {
    const parentId = (node as Record<string, unknown>)[parentKey] as
      | string
      | number
      | null
      | undefined;

    if (parentId !== null && parentId !== undefined) {
      const parent = lookup.get(parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  const toNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const sorter = (a: MenuNode<T>, b: MenuNode<T>) =>
    toNumber((a as Record<string, unknown>)[sortKey]) -
    toNumber((b as Record<string, unknown>)[sortKey]);

  const sortTree = (nodes: Array<MenuNode<T>>) => {
    nodes.sort(sorter);
    for (const child of nodes) {
      if (child.children.length) {
        sortTree(child.children);
      }
    }
  };

  sortTree(roots);

  return roots;
}
