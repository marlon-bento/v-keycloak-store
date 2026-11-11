// ========
// Guardiao de rotas do Vue Router para autenticacao OIDC/Keycloak e autorizacao RBAC.
// Valida sessao ativa, papeis (roles), grupos (groups), regras customizadas (customRules)
// e executa auto-recuperacao automatica na rota de erro 403.
// ========

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { useKeycloakStore } from './store';
import type { AuthGuardOptions } from './types';
import {
  checkAnyRole,
  checkAllRoles,
  checkAnyGroup,
  checkAllGroups
} from './authorization';

// Converte um valor unico ou lista de permissoes da meta da rota em um array tipado
function normalizarListaPermissoes(valor: string | readonly string[]): readonly string[] {
  return typeof valor === 'string' ? [valor] : valor;
}

// Verifica se a rota de destino corresponde a rota configurada para erro 403
function isForbiddenRoute(to: RouteLocationNormalized, forbiddenRoute?: RouteLocationRaw): boolean {
  if (!forbiddenRoute) return false;
  if (typeof forbiddenRoute === 'string') {
    return to.path === forbiddenRoute;
  }
  if ('name' in forbiddenRoute && forbiddenRoute.name && to.name === forbiddenRoute.name) {
    return true;
  }
  if ('path' in forbiddenRoute && forbiddenRoute.path && to.path === forbiddenRoute.path) {
    return true;
  }
  return false;
}

// Constroi o objeto de redirecionamento para a rota 403 preservando a URL original na query
function buildForbiddenTarget(forbiddenRoute: RouteLocationRaw, redirectPath: string): RouteLocationRaw {
  if (typeof forbiddenRoute === 'string') {
    return { path: forbiddenRoute, query: { redirect: redirectPath } };
  }
  return { ...forbiddenRoute, query: { redirect: redirectPath } };
}

// Cria e retorna a funcao de guardiao compativel com o router.beforeEach
export function createAuthGuard(options: AuthGuardOptions = {}) {
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

  function resolveKeycloak(store: any) {
    return providedKeycloak || store?.keycloakInstance || null;
  }

  async function evaluateAuthorization(targetRoute: RouteLocationNormalized) {
    const store = resolveStore();
    const userRoles: string[] = store?.roles || [];
    const userGroups: string[] = store?.groups || [];

    for (const record of targetRoute.matched) {
      if (record.meta?.roles) {
        const mode = record.meta.rolesMode || defaultRolesMode;
        const requiredRoles = normalizarListaPermissoes(record.meta.roles);
        const isAuthorized = mode === 'all'
          ? checkAllRoles(userRoles, requiredRoles)
          : checkAnyRole(userRoles, requiredRoles);

        if (!isAuthorized) return false;
      }

      if (record.meta?.groups) {
        const mode = record.meta.groupsMode || defaultGroupsMode;
        const requiredGroups = normalizarListaPermissoes(record.meta.groups);
        const isAuthorized = mode === 'all'
          ? checkAllGroups(userGroups, requiredGroups)
          : checkAnyGroup(userGroups, requiredGroups);

        if (!isAuthorized) return false;
      }

      if (customRules) {
        const customResult = await customRules(record, targetRoute);
        if (customResult === false) return false;
        if (customResult && typeof customResult === 'object') return customResult;
      }
    }
    return true;
  }

  return async function authGuard(to: RouteLocationNormalized) {
    const store = resolveStore();
    const keycloak = resolveKeycloak(store);

    if (keycloak?._isLoggingOut) {
      return false;
    }

    const hasAuthProtection = to.matched.some(
      (record) => record.meta?.requiresAuth || record.meta?.roles || record.meta?.groups
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

        if (keycloak?.login) {
          try {
            if (debug) {
              console.info(`Iniciando login do Keycloak. Rota: ${to.fullPath}`);
            }
            const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
            const redirectUri = origin ? `${origin}${to.fullPath}` : to.fullPath;
            await keycloak.login({ redirectUri });
            store?.getDataKeycloak?.();
            onLogin?.();
            if (!keycloak.authenticated) {
              return false;
            }
          } catch (error) {
            store?.registrarLogDeslogamento?.(`Erro ao redirecionar para login: ${error}`);
            store?.removeDataKeycloak?.();
            return false;
          }
        } else {
          return false;
        }
      }
    }

    if (forbiddenRoute && isForbiddenRoute(to, forbiddenRoute) && to.query?.redirect && router) {
      const targetPath = String(to.query.redirect);
      const targetRoute = router.resolve(targetPath) as unknown as RouteLocationNormalized;
      const isTargetAuthorized = await evaluateAuthorization(targetRoute);

      if (isTargetAuthorized === true) {
        return { path: targetPath };
      }
    }

    const authResult = await evaluateAuthorization(to);

    if (authResult === true) {
      return true;
    }

    if (authResult && typeof authResult === 'object') {
      return authResult;
    }

    onForbidden?.(to);

    if (forbiddenRoute) {
      return buildForbiddenTarget(forbiddenRoute, to.fullPath);
    }

    return false;
  };
}