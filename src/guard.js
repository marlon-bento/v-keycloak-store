import { useKeycloakStore } from './store.js';
import {
  checkAnyRole,
  checkAllRoles,
  checkAnyGroup,
  checkAllGroups
} from './authorization.js';

function isForbiddenRoute(to, forbiddenRoute) {
  if (!forbiddenRoute) return false;
  if (typeof forbiddenRoute === 'string') {
    return to.path === forbiddenRoute;
  }
  if (forbiddenRoute.name && to.name === forbiddenRoute.name) {
    return true;
  }
  if (forbiddenRoute.path && to.path === forbiddenRoute.path) {
    return true;
  }
  return false;
}

function buildForbiddenTarget(forbiddenRoute, redirectPath) {
  if (typeof forbiddenRoute === 'string') {
    return { path: forbiddenRoute, query: { redirect: redirectPath } };
  }
  return { ...forbiddenRoute, query: { redirect: redirectPath } };
}

export function createAuthGuard(options = {}) {
  const {
    router,
    keycloak: providedKeycloak,
    store: providedStore,
    initPromise,
    forbiddenRoute,
    onForbidden,
    onLogin,
    rolesMode: defaultRolesMode = 'any',
    groupsMode: defaultGroupsMode = 'any',
    customRules,
    debug = false
  } = options;

  function resolveStore() {
    if (providedStore) return providedStore;
    try {
      return useKeycloakStore();
    } catch {
      return null;
    }
  }

  function resolveKeycloak(store) {
    return providedKeycloak || store?.keycloakInstance || null;
  }

  async function evaluateAuthorization(targetRoute) {
    const store = resolveStore();
    const userRoles = store?.roles || [];
    const userGroups = store?.groups || [];

    for (const record of targetRoute.matched) {
      if (record.meta?.roles) {
        const mode = record.meta.rolesMode || defaultRolesMode;
        const requiredRoles = Array.isArray(record.meta.roles) ? record.meta.roles : [record.meta.roles];
        const isAuthorized = mode === 'all'
          ? checkAllRoles(userRoles, requiredRoles)
          : checkAnyRole(userRoles, requiredRoles);

        if (!isAuthorized) return false;
      }

      if (record.meta?.groups) {
        const mode = record.meta.groupsMode || defaultGroupsMode;
        const requiredGroups = Array.isArray(record.meta.groups) ? record.meta.groups : [record.meta.groups];
        const isAuthorized = mode === 'all'
          ? checkAllGroups(userGroups, requiredGroups)
          : checkAnyGroup(userGroups, requiredGroups);

        if (!isAuthorized) return false;
      }

      if (customRules && typeof customRules === 'function') {
        const customResult = await customRules(record, targetRoute);
        if (customResult === false) return false;
        if (typeof customResult === 'object' && customResult !== null) return customResult;
      }
    }
    return true;
  }

  return async function authGuard(to) {
    const store = resolveStore();
    const keycloak = resolveKeycloak(store);

    const hasAuthProtection = to.matched.some(
      record => record.meta?.requiresAuth || record.meta?.roles || record.meta?.groups
    );

    if (hasAuthProtection && initPromise) {
      await initPromise;
    }

    if (hasAuthProtection) {
      const isAuthenticated = Boolean(store?.token && keycloak?.authenticated);

      if (!isAuthenticated) {
        if (debug) {
          console.info(`Acesso negado na rota ${to.path}. Token vazio ou authenticated false.`);
        }
        store?.registrarLogDeslogamento?.(`Bloqueado pelo router na rota ${to.path}. Token vazio ou authenticated false.`);

        if (keycloak && typeof keycloak.login === 'function') {
          try {
            if (debug) {
              console.info(`Redirecionando para login do Keycloak. Rota: ${to.fullPath}`);
            }
            const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
            const redirectUri = origin ? `${origin}${to.fullPath}` : to.fullPath;
            await keycloak.login({ redirectUri });
            store?.getDataKeycloak?.();
            if (onLogin && typeof onLogin === 'function') {
              onLogin();
            }
            return false;
          } catch (error) {
            store?.registrarLogDeslogamento?.(`Erro ao redirecionar para login: ${error}`);
            store?.removeDataKeycloak?.();
            return false;
          }
        }

        return false;
      }
    }

    if (forbiddenRoute && isForbiddenRoute(to, forbiddenRoute) && to.query?.redirect && router) {
      const targetPath = to.query.redirect;
      const targetRoute = router.resolve(targetPath);
      const isTargetAuthorized = await evaluateAuthorization(targetRoute);

      if (isTargetAuthorized === true) {
        return { path: targetPath };
      }
    }

    const authResult = await evaluateAuthorization(to);

    if (authResult === true) {
      return true;
    }

    if (typeof authResult === 'object' && authResult !== null) {
      return authResult;
    }

    if (onForbidden && typeof onForbidden === 'function') {
      onForbidden(to);
    }

    if (forbiddenRoute) {
      return buildForbiddenTarget(forbiddenRoute, to.fullPath);
    }

    return false;
  };
}
