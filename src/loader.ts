import { DEFAULT_ACTIONS } from "./types";
import type { PermissionLoaderOptions } from "./types";
import { can, AuthorizationError } from "./tkmu";

/** A session/database boundary supplied by the application. No global user cache. */
export function createPermissionLoader(options: PermissionLoaderOptions) {
  const actions = [...new Set(options.actions ?? DEFAULT_ACTIONS)];
  const normalize = (slugs: readonly string[]) => [...new Set(slugs.map(s => s.trim()).filter(Boolean))];
  const load = async (slugs: readonly string[]) => {
    const user = slugs.length ? await options.getUser() : null;
    return Object.fromEntries(actions.map(action => [
      action, slugs.some(slug => can(user, `${slug}.${action}`, options.permissionOptions)),
    ])) as Record<string, boolean>;
  };
  return {
    async getPermissionsBySlug(slug: string) {
      const normalized = slug.trim();
      return { slug: normalized, actions: await load(normalized ? [normalized] : []) };
    },
    async getPermissionsByAnySlug(slugs: readonly string[]) {
      const normalized = normalize(slugs);
      return { slugs: normalized, actions: await load(normalized) };
    },
    async canAccessBySlug(slug: string, action = "view") {
      const normalized = slug.trim();
      if (!normalized || !actions.includes(action)) return false;
      return can(await options.getUser(), `${normalized}.${action}`, options.permissionOptions);
    },
    async assertAccessBySlug(slug: string, action = "view") {
      const normalized = slug.trim();
      if (!normalized || !actions.includes(action) || !can(await options.getUser(), `${normalized}.${action}`, options.permissionOptions)) {
        throw new AuthorizationError(`Forbidden: missing permission "${normalized}.${action}"`);
      }
    },
  };
}
