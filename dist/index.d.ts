import { Component } from 'vue';
import { ComputedRef } from 'vue';
import { Directive } from 'vue';
import { Plugin as Plugin_2 } from 'vue';
import { Ref } from 'vue';
import { RouteLocationAsPathGeneric } from 'vue-router';
import { RouteLocationAsRelativeGeneric } from 'vue-router';
import { RouteLocationMatched } from 'vue-router';
import { RouteLocationNormalized } from 'vue-router';
import { RouteLocationRaw } from 'vue-router';
import { Router } from 'vue-router';
import { ShallowRef } from 'vue';
import { SigninPopupArgs } from 'oidc-client-ts';
import { StoreDefinition } from 'pinia';
import { User } from 'oidc-client-ts';
import { UserManager } from 'oidc-client-ts';
import { UserManagerSettings } from 'oidc-client-ts';

export declare interface AuthGuardOptions {
    router?: Router;
    keycloak?: Partial<KeycloakAdapter> | null;
    store?: ReturnType<typeof useKeycloakStore> | Record<string, any> | null;
    initPromise?: Promise<unknown>;
    forbiddenRoute?: RouteLocationRaw;
    onForbidden?: (to: RouteLocationNormalized) => void;
    onLogin?: () => void;
    rolesMode?: 'any' | 'all';
    groupsMode?: 'any' | 'all';
    customRules?: (record: RouteLocationMatched, to: RouteLocationNormalized) => CustomRuleResult | Promise<CustomRuleResult>;
    debug?: boolean;
}

export declare type CanDirective = Directive<HTMLElement, CanDirectiveValue, CanDirectiveModifiers, 'role' | 'group'>;

export declare type CanDirectiveModifiers = 'all' | 'not' | 'disable';

export declare type CanDirectiveValue = string | string[] | readonly string[];

export declare function createAuthGuard(options?: AuthGuardOptions): (to: RouteLocationNormalized) => Promise<string | boolean | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric>;

export declare function createKeycloak(options: CreateKeycloakOptions): KeycloakAdapter;

export declare interface CreateKeycloakOptions {
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

export declare type CustomRuleResult = boolean | RouteLocationRaw | void;

export declare interface JwtPayload {
    sub?: string;
    preferred_username?: string;
    given_name?: string;
    name?: string;
    email?: string;
    groups?: string[];
    roles?: string[];
    realm_access?: {
        roles?: string[];
    };
    resource_access?: Record<string, {
        roles?: string[];
    }>;
    [key: string]: unknown;
}

export declare interface KeycloakAdapter {
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
    logout(options?: {
        redirectUri?: string;
    }): Promise<void>;
    updateToken(minValidity?: number): Promise<boolean>;
}

export declare interface KeycloakInitOptions {
    onLoad?: 'login-required' | 'check-sso';
    checkLoginIframe?: boolean;
    redirectUri?: string;
    [key: string]: unknown;
}

export declare interface KeycloakLoginOptions {
    redirectUri?: string;
    targetUrl?: string;
    prompt?: string;
    loginMode?: 'redirect' | 'popup';
    popupOverlay?: PopupOverlayOptions;
}

export declare const KeycloakPlugin: Plugin_2<[KeycloakPluginOptions]>;

export declare interface KeycloakPluginOptions {
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
    customRules?: (record: RouteLocationMatched, to: RouteLocationNormalized) => CustomRuleResult | Promise<CustomRuleResult>;
}

export declare function parseJwt(jwt?: string | null): JwtPayload | null;

export declare interface PopupOverlayOptions {
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
    customHandler?: (context: {
        triggerPopup: () => Promise<User>;
    }) => Promise<unknown>;
}

export declare const useKeycloakStore: StoreDefinition<"keycloakStore", Pick<{
setKeycloakInstance: (instance: KeycloakAdapter) => void;
loginAction: (options?: KeycloakLoginOptions) => Promise<void>;
loginPopupAction: () => Promise<void>;
keycloakInstance: ShallowRef<KeycloakAdapter | null, KeycloakAdapter | null>;
setModoDebug: (valor: boolean) => void;
token: Ref<string, string>;
token_decode: ComputedRef<JwtPayload | null>;
tokenParsed: ComputedRef<JwtPayload | null>;
authHeader: ComputedRef<    {
Authorization?: string;
}>;
groups: Ref<string[], string[]>;
roles: Ref<string[], string[]>;
isAuthenticated: ComputedRef<boolean>;
id: Ref<string | null, string | null>;
username: Ref<string | null, string | null>;
first_name: Ref<string | null, string | null>;
name: Ref<string | null, string | null>;
email: Ref<string | null, string | null>;
is_staff: Ref<boolean | null, boolean | null>;
is_superuser: Ref<boolean | null, boolean | null>;
getDataKeycloak: () => boolean;
is_memberof: (group: string) => boolean;
has_perm: (perm: string) => boolean | string | undefined;
hasRole: (role: string) => boolean;
hasAnyRole: (requiredRoles: readonly string[]) => boolean;
hasAllRoles: (requiredRoles: readonly string[]) => boolean;
hasGroup: (group: string) => boolean;
hasAnyGroup: (requiredGroups: readonly string[]) => boolean;
hasAllGroups: (requiredGroups: readonly string[]) => boolean;
removeDataKeycloak: () => void;
gravatar: ComputedRef<string | null>;
extend: Ref<Record<string, unknown>, Record<string, unknown>>;
setExtend: (key: string, value: unknown) => void;
removeExtend: (key: string) => void;
perms: Ref<string[], string[]>;
logoutAction: (motivo?: string | null) => void;
hasAccess: () => boolean;
registrarLogDeslogamento: (motivo: string, fatal?: boolean) => void;
}, "id" | "keycloakInstance" | "token" | "groups" | "roles" | "username" | "first_name" | "name" | "email" | "is_staff" | "is_superuser" | "extend" | "perms">, Pick<{
setKeycloakInstance: (instance: KeycloakAdapter) => void;
loginAction: (options?: KeycloakLoginOptions) => Promise<void>;
loginPopupAction: () => Promise<void>;
keycloakInstance: ShallowRef<KeycloakAdapter | null, KeycloakAdapter | null>;
setModoDebug: (valor: boolean) => void;
token: Ref<string, string>;
token_decode: ComputedRef<JwtPayload | null>;
tokenParsed: ComputedRef<JwtPayload | null>;
authHeader: ComputedRef<    {
Authorization?: string;
}>;
groups: Ref<string[], string[]>;
roles: Ref<string[], string[]>;
isAuthenticated: ComputedRef<boolean>;
id: Ref<string | null, string | null>;
username: Ref<string | null, string | null>;
first_name: Ref<string | null, string | null>;
name: Ref<string | null, string | null>;
email: Ref<string | null, string | null>;
is_staff: Ref<boolean | null, boolean | null>;
is_superuser: Ref<boolean | null, boolean | null>;
getDataKeycloak: () => boolean;
is_memberof: (group: string) => boolean;
has_perm: (perm: string) => boolean | string | undefined;
hasRole: (role: string) => boolean;
hasAnyRole: (requiredRoles: readonly string[]) => boolean;
hasAllRoles: (requiredRoles: readonly string[]) => boolean;
hasGroup: (group: string) => boolean;
hasAnyGroup: (requiredGroups: readonly string[]) => boolean;
hasAllGroups: (requiredGroups: readonly string[]) => boolean;
removeDataKeycloak: () => void;
gravatar: ComputedRef<string | null>;
extend: Ref<Record<string, unknown>, Record<string, unknown>>;
setExtend: (key: string, value: unknown) => void;
removeExtend: (key: string) => void;
perms: Ref<string[], string[]>;
logoutAction: (motivo?: string | null) => void;
hasAccess: () => boolean;
registrarLogDeslogamento: (motivo: string, fatal?: boolean) => void;
}, "token_decode" | "tokenParsed" | "authHeader" | "isAuthenticated" | "gravatar">, Pick<{
setKeycloakInstance: (instance: KeycloakAdapter) => void;
loginAction: (options?: KeycloakLoginOptions) => Promise<void>;
loginPopupAction: () => Promise<void>;
keycloakInstance: ShallowRef<KeycloakAdapter | null, KeycloakAdapter | null>;
setModoDebug: (valor: boolean) => void;
token: Ref<string, string>;
token_decode: ComputedRef<JwtPayload | null>;
tokenParsed: ComputedRef<JwtPayload | null>;
authHeader: ComputedRef<    {
Authorization?: string;
}>;
groups: Ref<string[], string[]>;
roles: Ref<string[], string[]>;
isAuthenticated: ComputedRef<boolean>;
id: Ref<string | null, string | null>;
username: Ref<string | null, string | null>;
first_name: Ref<string | null, string | null>;
name: Ref<string | null, string | null>;
email: Ref<string | null, string | null>;
is_staff: Ref<boolean | null, boolean | null>;
is_superuser: Ref<boolean | null, boolean | null>;
getDataKeycloak: () => boolean;
is_memberof: (group: string) => boolean;
has_perm: (perm: string) => boolean | string | undefined;
hasRole: (role: string) => boolean;
hasAnyRole: (requiredRoles: readonly string[]) => boolean;
hasAllRoles: (requiredRoles: readonly string[]) => boolean;
hasGroup: (group: string) => boolean;
hasAnyGroup: (requiredGroups: readonly string[]) => boolean;
hasAllGroups: (requiredGroups: readonly string[]) => boolean;
removeDataKeycloak: () => void;
gravatar: ComputedRef<string | null>;
extend: Ref<Record<string, unknown>, Record<string, unknown>>;
setExtend: (key: string, value: unknown) => void;
removeExtend: (key: string) => void;
perms: Ref<string[], string[]>;
logoutAction: (motivo?: string | null) => void;
hasAccess: () => boolean;
registrarLogDeslogamento: (motivo: string, fatal?: boolean) => void;
}, "setKeycloakInstance" | "loginAction" | "loginPopupAction" | "setModoDebug" | "getDataKeycloak" | "is_memberof" | "has_perm" | "hasRole" | "hasAnyRole" | "hasAllRoles" | "hasGroup" | "hasAnyGroup" | "hasAllGroups" | "removeDataKeycloak" | "setExtend" | "removeExtend" | "logoutAction" | "hasAccess" | "registrarLogDeslogamento">>;

export declare function usePermissions<TRole extends string = string>(customStore?: Partial<ReturnType<typeof useKeycloakStore>> | Record<string, any>): UsePermissionsReturn<TRole>;

export declare interface UsePermissionsReturn<TRole extends string = string> {
    hasRole: (role: TRole | string) => boolean;
    hasAnyRole: (roles: readonly (TRole | string)[]) => boolean;
    hasAllRoles: (roles: readonly (TRole | string)[]) => boolean;
    hasGroup: (group: string) => boolean;
    hasAnyGroup: (groups: readonly string[]) => boolean;
    hasAllGroups: (groups: readonly string[]) => boolean;
}

export { }


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


declare module 'vue' {
    interface GlobalDirectives {
        vCan: CanDirective;
        vHas: CanDirective;
    }
}
