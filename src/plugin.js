import { useKeycloakStore } from './store.js';
import directiveCan from './directiveCan.js';
import { createAuthGuard } from './guard.js';

// Configura e instala o plugin do Keycloak na aplicação Vue.
// Inicializa a instância, gerencia o ciclo de vida do token,
// protege as rotas verificando autenticação/RBAC e monitora eventos
// internos da biblioteca (como o Iframe de SSO) para registrar falhas.
export const KeycloakPlugin = {
  install: (app, options) => {
    app.directive('can', directiveCan);
    app.directive('has', directiveCan);

    if (!options || !options.keycloak) {
      throw new Error('A instância do Keycloak deve ser fornecida!');
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
      onForbidden,
      rolesMode,
      groupsMode,
      customRules
    } = options;

    const keycloakStore = useKeycloakStore();

    if (debug) {
      keycloakStore.setModoDebug(true);
      console.info('Modo debug ativado. Logs internos do Keycloak serão exibidos no console.');
    }

    keycloakStore.setKeycloakInstance(keycloak);

    const refreshAndSync = async () => {
      try {
        const refreshed = await keycloak.updateToken(70);
        if (refreshed) {
          if (debug) {
            console.info('Token renovado automaticamente.');
          }
          keycloakStore.getDataKeycloak();
        }
      } catch (error) {
        if (!keycloak.authenticated) {
          keycloakStore.logoutAction('Sessão perdida no refreshAndSync. O token expirou e o servidor recusou a renovação.');
          return;
        }
        keycloakStore.registrarLogDeslogamento('Erro de rede no refreshAndSync, mas a propriedade authenticated continua true. Evitando logout.', false);
      }
    };

    const startTokenRefresh = () => {
      setInterval(() => {
        refreshAndSync();
      }, refreshTimeout || 90000);
    };

    const initPromise = keycloak.init({
      ...optionsKeycloak
    }).then(() => {
      keycloakStore.getDataKeycloak();
      if (onReady && typeof onReady === 'function') {
        onReady();
      }

      // Evento disparado quando o Iframe silencioso detecta encerramento de sessão ou bloqueio de cookies
      keycloak.onAuthLogout = () => {
        keycloakStore.registrarLogDeslogamento('Evento nativo onAuthLogout disparado. O Iframe de verificação de SSO falhou ou a sessão encerrou em outra aba.');
        if (onLogout && typeof onLogout === 'function') {
          onLogout();
        }
      };

      // Falhas internas de comunicação reportadas pelo adaptador JavaScript
      keycloak.onAuthError = (errorData) => {
        const erroMsg = errorData ? JSON.stringify(errorData) : 'Erro desconhecido';
        keycloakStore.registrarLogDeslogamento(`Evento nativo onAuthError disparado pelo keycloak-js: ${erroMsg}`);
      };

      // Falhas nativas durante renovação de token em background
      keycloak.onAuthRefreshError = () => {
        keycloakStore.registrarLogDeslogamento('Evento nativo onAuthRefreshError disparado. A renovação em background falhou criticamente na biblioteca.');
      };

      // Expiração definitiva do token, disparando tentativa imediata de renovação
      keycloak.onTokenExpired = () => {
        keycloakStore.registrarLogDeslogamento('Evento nativo onTokenExpired acionado pelo keycloak-js.', false);
        refreshAndSync();
      };

      if (deactivateTimeout !== true) {
        startTokenRefresh();
      }
    }).catch((error) => {
      keycloakStore.registrarLogDeslogamento('Falha catastrófica no keycloak.init. O servidor não respondeu adequadamente.');
      if (onError && typeof onError === 'function') {
        onError(error);
        return;
      }
      throw new Error('Não foi possível inicializar o sistema de autenticação.');
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

    const isVueRouter4 = typeof router.hasRoute === 'function';

    if (isVueRouter4) {
      if (debug) {
        console.info('Vue Router 4 detectado. Usando guardião de rotas com retorno de Promise.');
      }
      router.beforeEach(authGuard);
      return;
    }

    if (debug) {
      console.info('Vue Router 3 detectado. Usando guardião de rotas com callback next().');
    }
    router.beforeEach(async (to, from, next) => {
      const result = await authGuard(to, from);
      if (result === true) {
        next();
        return;
      }
      if (result === false) {
        next(false);
        return;
      }
      next(result);
    });
  }
};