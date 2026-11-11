// ========
// Suite de testes unitarios para o guardiao de rotas (createAuthGuard).
// Valida redirecionamento para login, bloqueio 403, auto-recuperacao e customRules.
// ========

import test from 'node:test';
import assert from 'node:assert/strict';
import type { RouteLocationNormalized, Router } from 'vue-router';
import { createAuthGuard } from '../src/guard';
import type { KeycloakLoginOptions } from '../src/types';

function createMockKeycloak(authenticated = false) {
  return {
    authenticated,
    loginCalled: false,
    loginRedirectUri: '',
    async login(options?: KeycloakLoginOptions) {
      this.loginCalled = true;
      this.loginRedirectUri = options?.redirectUri ?? '';
    }
  };
}

interface MockStoreOptions {
  token?: string;
  roles?: string[];
  groups?: string[];
}

function createMockStore({ token = '', roles = [], groups = [] }: MockStoreOptions = {}) {
  return {
    token,
    roles,
    groups,
    logs: [] as string[],
    registrarLogDeslogamento(msg: string) {
      this.logs.push(msg);
    },
    getDataKeycloak() {
      return true;
    },
    removeDataKeycloak() {}
  };
}

test('permite navegacao quando rota nao possui regras de autenticacao', async () => {
  const guard = createAuthGuard({
    store: createMockStore(),
    keycloak: createMockKeycloak(false)
  });

  const to = {
    matched: [{ meta: {} }],
    path: '/public',
    fullPath: '/public'
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.equal(result, true);
});

test('redireciona para login do Keycloak quando rota exige autenticacao e usuario nao autenticado', async () => {
  const keycloak = createMockKeycloak(false);
  const store = createMockStore();
  const guard = createAuthGuard({
    store,
    keycloak,
    initPromise: Promise.resolve()
  });

  const to = {
    matched: [{ meta: { requiresAuth: true } }],
    path: '/dashboard',
    fullPath: '/dashboard?tab=1'
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.equal(result, false);
  assert.equal(keycloak.loginCalled, true);
  assert.match(keycloak.loginRedirectUri, /\/dashboard\?tab=1/);
});

test('redireciona para forbiddenRoute quando usuario autenticado nao possui role exigida', async () => {
  const keycloak = createMockKeycloak(true);
  const store = createMockStore({
    token: 'mock-token',
    roles: ['INVENTARIO_VIEW_EQUIPAMENTO']
  });
  let onForbiddenCalledWith: RouteLocationNormalized | null = null;

  const guard = createAuthGuard({
    store,
    keycloak,
    forbiddenRoute: { name: 'error-403' },
    onForbidden: (route) => {
      onForbiddenCalledWith = route;
    }
  });

  const to = {
    name: 'criar-equipamento',
    path: '/gerenciar/equipamentos/criar',
    fullPath: '/gerenciar/equipamentos/criar',
    matched: [
      { meta: { requiresAuth: true } },
      { meta: { roles: ['INVENTARIO_MANAGE_EQUIPAMENTO'] } }
    ]
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.deepEqual(result, {
    name: 'error-403',
    query: { redirect: '/gerenciar/equipamentos/criar' }
  });
  assert.equal(onForbiddenCalledWith, to);
});

test('libera rota quando usuario possui role requerida', async () => {
  const keycloak = createMockKeycloak(true);
  const store = createMockStore({
    token: 'mock-token',
    roles: ['INVENTARIO_MANAGE_EQUIPAMENTO']
  });

  const guard = createAuthGuard({
    store,
    keycloak,
    forbiddenRoute: { name: 'error-403' }
  });

  const to = {
    name: 'criar-equipamento',
    path: '/gerenciar/equipamentos/criar',
    fullPath: '/gerenciar/equipamentos/criar',
    matched: [
      { meta: { roles: ['INVENTARIO_MANAGE_EQUIPAMENTO'] } }
    ]
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.equal(result, true);
});

test('recupera automaticamente do 403 quando usuario ja tem permissao para a rota de destino', async () => {
  const keycloak = createMockKeycloak(true);
  const store = createMockStore({
    token: 'mock-token',
    roles: ['INVENTARIO_VIEW_AUDITORIA']
  });

  const mockRouter = {
    resolve(path: string) {
      if (path === '/gerenciar/auditorias') {
        return {
          path,
          fullPath: path,
          matched: [
            { meta: { roles: ['INVENTARIO_VIEW_AUDITORIA'] } }
          ]
        };
      }
      return { path, fullPath: path, matched: [] };
    }
  } as unknown as Router;

  const guard = createAuthGuard({
    router: mockRouter,
    store,
    keycloak,
    forbiddenRoute: { name: 'error-403' }
  });

  const to = {
    name: 'error-403',
    path: '/403',
    fullPath: '/403?redirect=/gerenciar/auditorias',
    query: { redirect: '/gerenciar/auditorias' },
    matched: [{ meta: {} }]
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.deepEqual(result, { path: '/gerenciar/auditorias' });
});

test('executa customRules adequadamente para integracao com feature flags ou regras externas', async () => {
  const keycloak = createMockKeycloak(true);
  const store = createMockStore({ token: 'mock-token' });

  const guard = createAuthGuard({
    store,
    keycloak,
    forbiddenRoute: { name: 'error-403' },
    customRules: async (record) => {
      if (record.meta?.featureFlag === 'NOVO_FLUXO') {
        return false;
      }
      return true;
    }
  });

  const to = {
    path: '/recurso-beta',
    fullPath: '/recurso-beta',
    matched: [
      { meta: { featureFlag: 'NOVO_FLUXO' } }
    ]
  } as unknown as RouteLocationNormalized;

  const result = await guard(to);

  assert.deepEqual(result, {
    name: 'error-403',
    query: { redirect: '/recurso-beta' }
  });
});