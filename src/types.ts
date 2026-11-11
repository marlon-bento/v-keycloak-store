// ========
// Definicoes de tipos e interfaces globais do pacote v-keycloak-store.
// Estende automaticamente o RouteMeta do Vue Router e registra a tipagem das
// diretivas v-can e v-has para autocompletar no VS Code.
// ========

import type { Directive, Component } from 'vue';
import type {
  Router,
  RouteLocationRaw,
  RouteLocationNormalized,
  RouteLocationMatched
} from 'vue-router';
import type { UserManager, UserManagerSettings, User, SigninPopupArgs } from 'oidc-client-ts';
import type { useKeycloakStore } from './store';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string | string[] | readonly string[];
    rolesMode?: 'any' | 'all';
    groups?: string | string[] | readonly string[];
    groupsMode?: 'any' | 'all';
    [key: string]: unknown;
  }
}

export type CanDirectiveValue = string | string[] | readonly string[];
export type CanDirectiveModifiers = 'all' | 'not' | 'disable';
export type CanDirective = Directive<HTMLElement, CanDirectiveValue, CanDirectiveModifiers, 'role' | 'group'>;

declare module 'vue' {
  export interface GlobalDirectives {
    vCan: CanDirective;
    vHas: CanDirective;
  }
}

export interface KeycloakInitOptions {
  onLoad?: 'login-required' | 'check-sso';
  checkLoginIframe?: boolean;
  redirectUri?: string;
  [key: string]: unknown;
}

export interface PopupOverlayOptions {
  title?: string;
  message?: string;
  waitingMessage?: string;
  retryMessage?: string;
  buttonText?: string;
  waitingButtonText?: string;
  logoUrl?: string | null;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  primaryColor?: string;
  component?: Component;
  customHandler?: (context: { triggerPopup: () => Promise<User> }) => Promise<unknown>;
}

export interface CreateKeycloakOptions {
  url: string;
  realm: string;
  clientId: string;
  loginMode?: 'redirect' | 'popup';
  popupOverlay?: PopupOverlayOptions;
  popupWindowFeatures?: Record<string, unknown>;
  scope?: string;
  storage?: 'localStorage' | 'sessionStorage';
  redirectUri?: string;
  popupRedirectUri?: string;
  postLogoutRedirectUri?: string;
  automaticSilentRenew?: boolean;
  monitorSession?: boolean;
  oidcSettings?: Partial<UserManagerSettings>;
}

export interface KeycloakLoginOptions {
  redirectUri?: string;
  targetUrl?: string;
  prompt?: string;
  loginMode?: 'redirect' | 'popup';
  popupOverlay?: PopupOverlayOptions;
}

export interface JwtPayload {
  sub?: string;
  preferred_username?: string;
  given_name?: string;
  name?: string;
  email?: string;
  groups?: string[];
  roles?: string[];
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  [key: string]: unknown;
}

export interface KeycloakAdapter {
  userManager: UserManager;
  clientId: string;
  realm: string;
  url: string;
  loginMode: 'redirect' | 'popup';
  popupOverlayConfig: PopupOverlayOptions;
  authenticated: boolean;
  token: string | null;
  idToken: string | null;
  refreshToken: string | null;
  tokenParsed: JwtPayload | null;
  idTokenParsed: JwtPayload | null;
  onAuthLogout: (() => void) | null;
  onAuthError: ((error: unknown) => void) | null;
  onAuthRefreshError: ((error: unknown) => void) | null;
  onTokenExpired: (() => void) | null;
  onUserLoaded: ((user: User) => void) | null;
  _storageListenerBound: boolean;
  _isLoggingOut: boolean;
  _defaultPostLogoutRedirectUri?: string;
  _syncUser(user: User | null): void;
  _setupCrossTabStorageSync(): void;
  init(options?: KeycloakInitOptions): Promise<boolean>;
  login(options?: KeycloakLoginOptions): Promise<void>;
  loginPopup(options?: SigninPopupArgs): Promise<User>;
  logout(options?: { redirectUri?: string }): Promise<void>;
  updateToken(minValidity?: number): Promise<boolean>;
}

export type CustomRuleResult = boolean | RouteLocationRaw | void;

export interface AuthGuardOptions {
  router?: Router;
  keycloak?: Partial<KeycloakAdapter> | null;
  store?: ReturnType<typeof useKeycloakStore> | Record<string, any> | null;
  initPromise?: Promise<unknown>;
  forbiddenRoute?: RouteLocationRaw;
  onForbidden?: (to: RouteLocationNormalized) => void;
  onLogin?: () => void;
  rolesMode?: 'any' | 'all';
  groupsMode?: 'any' | 'all';
  customRules?: (
    record: RouteLocationMatched,
    to: RouteLocationNormalized
  ) => CustomRuleResult | Promise<CustomRuleResult>;
  debug?: boolean;
}

export interface KeycloakPluginOptions {
  keycloak: KeycloakAdapter;
  router: Router;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  onLogout?: () => void;
  onLogin?: () => void;
  optionsKeycloak?: KeycloakInitOptions;
  refreshTimeout?: number;
  deactivateTimeout?: boolean;
  debug?: boolean;
  forbiddenRoute?: RouteLocationRaw;
  logoutRoute?: RouteLocationRaw;
  onForbidden?: (to: RouteLocationNormalized) => void;
  rolesMode?: 'any' | 'all';
  groupsMode?: 'any' | 'all';
  customRules?: (
    record: RouteLocationMatched,
    to: RouteLocationNormalized
  ) => CustomRuleResult | Promise<CustomRuleResult>;
}

export interface UsePermissionsReturn<TRole extends string = string> {
  hasRole: (role: TRole | string) => boolean;
  hasAnyRole: (roles: readonly (TRole | string)[]) => boolean;
  hasAllRoles: (roles: readonly (TRole | string)[]) => boolean;
  hasGroup: (group: string) => boolean;
  hasAnyGroup: (groups: readonly string[]) => boolean;
  hasAllGroups: (groups: readonly string[]) => boolean;
}