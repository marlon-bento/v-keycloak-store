// ========
// Plugin principal do Vue 3 para inicializacao do adaptador OIDC/Keycloak,
// registro das diretivas v-can e v-has, controle do ciclo de renovacao de token,
// validacao inteligente de SSO ao focar na aba/janela e instalacao do guardiao de rotas.
// ========

import type { App, Plugin } from 'vue';
import { useKeycloakStore } from './store';
import directiveCan from './directiveCan';
import { createAuthGuard } from './guard';
import type { KeycloakPluginOptions } from './types';

export const KeycloakPlugin: Plugin<[KeycloakPluginOptions]> = {
  install: (app: App, options: KeycloakPluginOptions) => {
    app.directive('can', directiveCan);
    app.directive('has', directiveCan);

    if (!options?.keycloak) {
      throw new Error('A instância do Keycloak/OIDC deve ser fornecida!');
    }
    if (!options.router) {
      throw new Error('O roteador (router) deve ser fornecido!');
    }

    const {
      keycloak,
      router,
      onReady,
      onError,
      onLogout,
      onLogin,
      optionsKeycloak,
      refreshTimeout,
      deactivateTimeout,
      debug,
      forbiddenRoute,
      logoutRoute,
      onForbidden,
      rolesMode,
      groupsMode,
      customRules
    } = options;

    const keycloakStore = useKeycloakStore();

    if (debug) {
      keycloakStore.setModoDebug(true);
      console.info('[v-keycloak-store] Modo debug ativado.');
    }

    // Resolve o objeto de rota do Vue Router para a URL completa exigida pelo servidor OIDC no pos-logout
    if (logoutRoute && typeof window !== 'undefined') {
      const rotaResolvida = router.resolve(logoutRoute);
      keycloak._defaultPostLogoutRedirectUri = new URL(rotaResolvida.href, window.location.origin).href;
    }

    keycloakStore.setKeycloakInstance(keycloak);

    let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
    let lastFocusCheckTimestamp = Date.now();
    let visibilityListenerBound = false;
    let isCheckingSession = false;

    const stopTokenRefresh = () => {
      if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    };

    // Redireciona para logoutRoute (se definida) ou aciona login caso a sessao caia em uma rota protegida
    const handleSessionLostOnProtectedRoute = () => {
      if (logoutRoute) {
        router.push(logoutRoute);
        return;
      }

      const currentRoute = router.currentRoute?.value;
      const requiresAuth = currentRoute?.matched?.some(
        (record) => record.meta?.requiresAuth || record.meta?.roles || record.meta?.groups
      );

      if (requiresAuth) {
        const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
        const redirectUri = origin && currentRoute?.fullPath ? `${origin}${currentRoute.fullPath}` : undefined;
        keycloak.login({ redirectUri });
      }
    };

    keycloak.onUserLoaded = () => {
      keycloakStore.getDataKeycloak();
    };

    // Sincroniza ou encerra a sessao quando o token e verificado no servidor
    const refreshAndSync = async (forceServerCheck = false) => {
      if (!keycloak.authenticated || keycloak._isLoggingOut || isCheckingSession) return;
      isCheckingSession = true;

      try {
        const minValidity = forceServerCheck ? -1 : 70;
        const refreshed = await keycloak.updateToken(minValidity);
        lastFocusCheckTimestamp = Date.now();
        if (refreshed) {
          if (debug) {
            console.info('[v-keycloak-store] Token renovado e sincronizado com sucesso.');
          }
          keycloakStore.getDataKeycloak();
        }
      } catch {
        if (!keycloak.authenticated) {
          stopTokenRefresh();
          keycloakStore.registrarLogDeslogamento(
            'Sessão encerrada remotamente no servidor SSO ou token expirado sem renovação.',
            true
          );
          keycloakStore.removeDataKeycloak();
          onLogout?.();
          handleSessionLostOnProtectedRoute();
          return;
        }
        keycloakStore.registrarLogDeslogamento('Oscilação de rede no refreshAndSync, mantendo sessão local ativa.', false);
      } finally {
        isCheckingSession = false;
      }
    };

    // Revalida silenciosamente a sessao SSO quando o usuario alterna de aba ou clica de volta na janela
    const setupVisibilitySessionCheck = () => {
      if (typeof document === 'undefined' || visibilityListenerBound) return;
      visibilityListenerBound = true;

      const checkOnReturn = () => {
        if (document.visibilityState !== 'visible' || !keycloak.authenticated || keycloak._isLoggingOut) return;

        const elapsedMs = Date.now() - lastFocusCheckTimestamp;
        if (elapsedMs > 2000) {
          lastFocusCheckTimestamp = Date.now();
          refreshAndSync(true);
        }
      };

      document.addEventListener('visibilitychange', checkOnReturn);
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', checkOnReturn);
      }
    };

    const startTokenRefresh = () => {
      stopTokenRefresh();
      refreshIntervalId = setInterval(() => {
        refreshAndSync(false);
      }, refreshTimeout || 90000);
    };

    const initPromise = keycloak.init({
      ...optionsKeycloak
    }).then((authenticated) => {
      keycloakStore.getDataKeycloak();

      if (authenticated) {
        onLogin?.();
      }

      onReady?.();

      keycloak.onAuthLogout = () => {
        stopTokenRefresh();
        keycloakStore.registrarLogDeslogamento('Sessão encerrada (onAuthLogout / outra aba ou SSO).');
        keycloakStore.removeDataKeycloak();
        onLogout?.();
        handleSessionLostOnProtectedRoute();
      };

      keycloak.onAuthError = (errorData) => {
        const erroMsg = errorData ? JSON.stringify(errorData) : 'Erro desconhecido';
        keycloakStore.registrarLogDeslogamento(`Evento onAuthError disparado: ${erroMsg}`, false);
      };

      keycloak.onAuthRefreshError = () => {
        keycloakStore.registrarLogDeslogamento('Falha na renovação silenciosa do token em background.', false);
      };

      keycloak.onTokenExpired = () => {
        keycloakStore.registrarLogDeslogamento('Token expirado, acionando refreshAndSync.', false);
        refreshAndSync(false);
      };

      if (deactivateTimeout !== true) {
        startTokenRefresh();
        setupVisibilitySessionCheck();
      }
    }).catch((error: any) => {
      keycloakStore.registrarLogDeslogamento(`Erro no init da autenticação: ${error?.message || error}`, false);
      if (onError) {
        onError(error);
      } else {
        console.error('[v-keycloak-store] Falha ao inicializar autenticação:', error);
      }
      onReady?.();
    });

    const authGuard = createAuthGuard({
      router,
      keycloak,
      store: keycloakStore,
      initPromise,
      forbiddenRoute,
      onForbidden,
      onLogin,
      rolesMode,
      groupsMode,
      customRules,
      debug
    });

    router.beforeEach(authGuard);
  }
};