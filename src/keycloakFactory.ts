// ========
// Fabrica de criacao e adaptacao do cliente OIDC (oidc-client-ts) para o padrao Keycloak.
// Gerencia sessao OIDC, sincronizacao entre multiplas abas via WebStorage e
// delega a interface de login em Popup para o modulo isolado popupGate.
// ========

import { UserManager, WebStorageStateStore, type UserManagerSettings, type User } from 'oidc-client-ts';
import type {
  CreateKeycloakOptions,
  KeycloakAdapter,
  KeycloakInitOptions,
  KeycloakLoginOptions
} from './types';
import { parseJwt, limparParametrosOAuthUrl } from './jwt';
import { exibirOverlayPopup } from './popupGate';

export { parseJwt };

// Instancia e retorna o adaptador OIDC compativel com o ciclo de vida do plugin
export function createKeycloak(options: CreateKeycloakOptions): KeycloakAdapter {
  if (!options?.url || !options?.realm || !options?.clientId) {
    throw new Error('As opções url, realm e clientId são obrigatórias para criar a instância de autenticação.');
  }

  const cleanUrl = options.url.replace(/\/+$/, '');
  const authority = `${cleanUrl}/realms/${options.realm}`;
  const isBrowser = typeof window !== 'undefined';

  // Usa o pathname atual como padrao para suportar subrotas (ex: /panel) automaticamente
  const defaultRedirectUri = isBrowser ? `${window.location.origin}${window.location.pathname}` : '';

  const loginMode = options.loginMode || 'redirect';
  const popupOverlayConfig = options.popupOverlay || {};

  const storageBackend = isBrowser
    ? (options.storage === 'sessionStorage' ? window.sessionStorage : window.localStorage)
    : undefined;

  const redirectUri = options.redirectUri || defaultRedirectUri;
  const postLogoutRedirectUri = options.postLogoutRedirectUri || (isBrowser ? `${window.location.origin}/` : redirectUri);

  const settings: UserManagerSettings = {
    authority,
    client_id: options.clientId,
    redirect_uri: redirectUri,
    popup_redirect_uri: options.popupRedirectUri || redirectUri,
    post_logout_redirect_uri: postLogoutRedirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: options.scope || 'openid profile email',
    automaticSilentRenew: options.automaticSilentRenew !== false,
    monitorSession: options.monitorSession !== false,
    checkSessionIntervalInSeconds: 2,
    silentRequestTimeoutInSeconds: 5,
    filterProtocolClaims: false,
    loadUserInfo: false,
    popupWindowFeatures: {
      width: 520,
      height: 640,
      left: isBrowser ? Math.max(0, Math.round(window.screenX + (window.outerWidth - 520) / 2)) : 100,
      top: isBrowser ? Math.max(0, Math.round(window.screenY + (window.outerHeight - 640) / 2)) : 100,
      ...(options.popupWindowFeatures || {})
    },
    ...(storageBackend ? { userStore: new WebStorageStateStore({ store: storageBackend }) } : {}),
    ...(options.oidcSettings || {})
  };

  const userManager = new UserManager(settings);
  const storageKeySuffix = `oidc.user:${authority}:${options.clientId}`;

  const adapter: KeycloakAdapter = {
    userManager,
    clientId: options.clientId,
    realm: options.realm,
    url: cleanUrl,
    loginMode,
    popupOverlayConfig,
    authenticated: false,
    token: null,
    idToken: null,
    refreshToken: null,
    tokenParsed: null,
    idTokenParsed: null,

    onAuthLogout: null,
    onAuthError: null,
    onAuthRefreshError: null,
    onTokenExpired: null,
    onUserLoaded: null,
    _storageListenerBound: false,
    _isLoggingOut: false,
    _defaultLoginRedirectUri: options.redirectUri,
    _defaultPostLogoutRedirectUri: options.postLogoutRedirectUri,

    // Sincroniza os tokens do objeto User do oidc-client-ts com as propriedades do adaptador
    _syncUser(user: User | null) {
      if (user && !user.expired && user.access_token) {
        this.authenticated = true;
        this.token = user.access_token;
        this.idToken = user.id_token || null;
        this.refreshToken = user.refresh_token || null;
        this.tokenParsed = parseJwt(user.access_token);
        this.idTokenParsed = user.id_token
          ? parseJwt(user.id_token)
          : ((user.profile as Record<string, unknown>) || this.tokenParsed);
      } else {
        this.authenticated = false;
        this.token = null;
        this.idToken = null;
        this.refreshToken = null;
        this.tokenParsed = null;
        this.idTokenParsed = null;
      }
    },

    // Escuta alteracoes no localStorage feitas por outras abas da mesma aplicacao
    _setupCrossTabStorageSync() {
      if (!isBrowser || this._storageListenerBound || options.storage === 'sessionStorage') return;
      this._storageListenerBound = true;

      window.addEventListener('storage', async (event: StorageEvent) => {
        if (!event.key || !event.key.endsWith(storageKeySuffix)) return;

        if (!event.newValue) {
          if (this.authenticated && !this._isLoggingOut) {
            this._syncUser(null);
            this.onAuthLogout?.();
          }
          return;
        }

        const updatedUser = await userManager.getUser();
        if (updatedUser && !updatedUser.expired) {
          this._syncUser(updatedUser);
          this.onUserLoaded?.(updatedUser);
        }
      });
    },

    // Inicializa os listeners de sessao OIDC, processa callbacks e valida a sessao ativa
    async init(initOptions: KeycloakInitOptions = {}) {
      this._isLoggingOut = false;
      this._setupCrossTabStorageSync();

      userManager.events.addUserLoaded((user) => {
        this._syncUser(user);
        this.onUserLoaded?.(user);
      });

      userManager.events.addUserUnloaded(() => {
        if (!this.authenticated || this._isLoggingOut) return;
        this._syncUser(null);
        this.onAuthLogout?.();
      });

      userManager.events.addUserSignedOut(async () => {
        if (this._isLoggingOut) return;
        await userManager.removeUser();
        this._syncUser(null);
        this.onAuthLogout?.();
      });

      userManager.events.addSilentRenewError((err) => {
        this.onAuthRefreshError?.(err);
      });

      userManager.events.addAccessTokenExpired(() => {
        this.onTokenExpired?.();
      });

      if (isBrowser) {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hasAuthCallback =
          (searchParams.has('code') && searchParams.has('state')) ||
          (hashParams.has('code') && hashParams.has('state')) ||
          searchParams.has('error') ||
          hashParams.has('error');

        if (window.parent && window.parent !== window && hasAuthCallback) {
          try {
            await userManager.signinSilentCallback();
          } catch {
            // Ignora erro se nao for callback de silent renew
          }
          return new Promise<boolean>(() => {});
        }

        if (window.opener && window.opener !== window && hasAuthCallback) {
          try {
            await userManager.signinPopupCallback();
          } catch (e) {
            console.error('[v-keycloak-store] Erro no callback do popup:', e);
          }
          window.close();
          return new Promise<boolean>(() => {});
        }

        if (window.location.hash.includes('error=') || window.location.search.includes('error=')) {
          limparParametrosOAuthUrl();
        }

        if (hasAuthCallback) {
          try {
            const user = await userManager.signinRedirectCallback(window.location.href);
            this._syncUser(user);
            limparParametrosOAuthUrl();
            const stateObj = user?.state as { targetUrl?: string } | undefined;
            if (stateObj?.targetUrl) {
              window.history.replaceState({}, document.title, stateObj.targetUrl);
            }
            return true;
          } catch (err) {
            console.error('[v-keycloak-store] Falha ao processar callback de redirecionamento OIDC:', err);
            limparParametrosOAuthUrl();
          }
        }
      }

      let user = await userManager.getUser();

      if (user) {
        try {
          user = await userManager.signinSilent();
        } catch (err: any) {
          const errMsg = String(err?.message || err || '').toLowerCase();
          if (
            user?.expired ||
            errMsg.includes('login_required') ||
            errMsg.includes('session_not_active') ||
            errMsg.includes('invalid_grant') ||
            errMsg.includes('interaction_required')
          ) {
            await userManager.removeUser();
            user = null;
          }
        }
      }

      this._syncUser(user);

      if (!this.authenticated && initOptions?.onLoad === 'login-required') {
        await this.login({
          redirectUri: initOptions.redirectUri
        });
        return this.authenticated;
      }

      return this.authenticated;
    },

    // Inicia o fluxo de autenticacao via Redirect ou Popup
    async login(loginOptions: KeycloakLoginOptions = {}) {
      if (!isBrowser || this._isLoggingOut) return;
      limparParametrosOAuthUrl();

      const mode = loginOptions.loginMode || this.loginMode;

      if (mode === 'popup') {
        await exibirOverlayPopup(
          userManager,
          this.popupOverlayConfig,
          loginOptions.popupOverlay,
          (user) => this._syncUser(user)
        );
        return;
      }

      const rawRedirect =
        loginOptions.redirectUri ||
        this._defaultLoginRedirectUri ||
        `${window.location.origin}${window.location.pathname}`;

      const cleanRedirectUri = rawRedirect.split('?')[0].split('#')[0];

      const targetUrl = loginOptions.targetUrl || (
        loginOptions.redirectUri
          ? loginOptions.redirectUri.replace(window.location.origin, '')
          : (this._defaultLoginRedirectUri
              ? this._defaultLoginRedirectUri.replace(window.location.origin, '')
              : (window.location.pathname + window.location.search))
      );

      await userManager.signinRedirect({
        redirect_uri: cleanRedirectUri,
        state: { targetUrl },
        ...(loginOptions.prompt ? { prompt: loginOptions.prompt } : {})
      });
    },

    // Executa login diretamente em janela popup sem overlay intermediario
    async loginPopup(loginOptions = {}) {
      const user = await userManager.signinPopup(loginOptions);
      this._syncUser(user);
      return user;
    },

    // Remove os tokens locais e redireciona para o endpoint de end_session do Keycloak
    async logout(logoutOptions = {}) {
      this._isLoggingOut = true;
      const idTokenHint = this.idToken;
      this._syncUser(null);

      await userManager.removeUser();

      if (!isBrowser) return;
      const targetPostLogoutUri =
        logoutOptions.redirectUri ||
        this._defaultPostLogoutRedirectUri ||
        settings.post_logout_redirect_uri ||
        `${window.location.origin}/`;

      try {
        await userManager.signoutRedirect({
          post_logout_redirect_uri: targetPostLogoutUri,
          id_token_hint: idTokenHint || undefined
        });
      } catch (err) {
        console.error('[v-keycloak-store] Erro ao redirecionar para logout no Keycloak:', err);
        window.location.replace(targetPostLogoutUri);
      }
    },

    // Verifica se o token expira dentro de minValidity segundos e renova no servidor
    async updateToken(minValidity = 70) {
      if (this._isLoggingOut) return false;

      const user = await userManager.getUser();
      if (!user) {
        this._syncUser(null);
        throw new Error('Sem sessão ativa para renovar.');
      }

      if (minValidity !== -1 && user.expires_in !== undefined && user.expires_in > minValidity) {
        this._syncUser(user);
        return false;
      }

      try {
        const refreshedUser = await userManager.signinSilent();
        if (!refreshedUser) {
          throw new Error('Não foi possível renovar o token.');
        }
        this._syncUser(refreshedUser);
        return true;
      } catch (err: any) {
        const errMsg = String(err?.message || err || '').toLowerCase();
        if (
          minValidity === -1 ||
          errMsg.includes('login_required') ||
          errMsg.includes('session_not_active') ||
          errMsg.includes('invalid_grant') ||
          errMsg.includes('interaction_required')
        ) {
          await userManager.removeUser();
          this._syncUser(null);
        }
        throw err;
      }
    }
  };

  return adapter;
}