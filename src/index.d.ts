import type { Plugin } from 'vue';
import type {
  Router,
  RouteLocationRaw,
  RouteLocationNormalized,
  RouteLocationMatched,
  NavigationGuard
} from 'vue-router';
import type Keycloak from 'keycloak-js';
import type { KeycloakInitOptions } from 'keycloak-js';
import type { StoreDefinition } from 'pinia';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string[] | readonly string[];
    rolesMode?: 'any' | 'all';
    groups?: string[] | readonly string[];
    groupsMode?: 'any' | 'all';
    [key: string]: unknown;
  }
}

export interface CreateKeycloakOptions {
  url: string;
  realm: string;
  clientId: string;
  [key: string]: unknown;
}

export function createKeycloak(options: CreateKeycloakOptions): Keycloak;

export type CustomRuleResult = boolean | RouteLocationRaw | void;

export interface AuthGuardOptions {
  router?: Router;
  keycloak?: Keycloak;
  store?: ReturnType<typeof useKeycloakStore>;
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

export function createAuthGuard(options: AuthGuardOptions): NavigationGuard;

export interface KeycloakPluginOptions {
  keycloak: Keycloak;
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
  onForbidden?: (to: RouteLocationNormalized) => void;
  rolesMode?: 'any' | 'all';
  groupsMode?: 'any' | 'all';
  customRules?: (
    record: RouteLocationMatched,
    to: RouteLocationNormalized
  ) => CustomRuleResult | Promise<CustomRuleResult>;
}

export const KeycloakPlugin: Plugin<[KeycloakPluginOptions]>;

export interface UsePermissionsReturn<TRole extends string = string> {
  hasRole: (role: TRole | string) => boolean;
  hasAnyRole: (roles: (TRole | string)[]) => boolean;
  hasAllRoles: (roles: (TRole | string)[]) => boolean;
  hasGroup: (group: string) => boolean;
  hasAnyGroup: (groups: string[]) => boolean;
  hasAllGroups: (groups: string[]) => boolean;
}

export function usePermissions<TRole extends string = string>(): UsePermissionsReturn<TRole>;

export interface KeycloakStoreState {
  keycloakInstance: Keycloak | null;
  token: string;
  id: string | null;
  username: string | null;
  first_name: string | null;
  name: string | null;
  email: string | null;
  is_staff: boolean | null;
  is_superuser: boolean | null;
  perms: string[];
  groups: string[];
  roles: string[];
  extend: Record<string, unknown>;
}

export interface KeycloakStoreGetters {
  token_decode: unknown;
  isAuthenticated: boolean;
  gravatar: string | null;
}

export interface KeycloakStoreActions {
  setKeycloakInstance(instance: Keycloak): void;
  setModoDebug(valor: boolean): void;
  setExtend(key: string, value: unknown): void;
  removeExtend(key: string): void;
  logoutAction(motivo?: string | null): void;
  getDataKeycloak(): boolean;
  removeDataKeycloak(): void;
  hasAccess(): boolean;
  has_perm(perm: string): boolean | string | undefined;
  is_memberof(group: string): boolean;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  hasGroup(group: string): boolean;
  hasAnyGroup(groups: string[]): boolean;
  hasAllGroups(groups: string[]): boolean;
  registrarLogDeslogamento(motivo: string, fatal?: boolean): void;
}

export const useKeycloakStore: StoreDefinition<
  "keycloakStore",
  KeycloakStoreState,
  KeycloakStoreGetters,
  KeycloakStoreActions
>;
