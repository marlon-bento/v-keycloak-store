// ========
// Composable reativo para verificacao de papeis (roles) e grupos (groups)
// em componentes Vue. Respeita automaticamente a flag is_superuser da store.
// ========

import { useKeycloakStore } from './store';
import type { UsePermissionsReturn } from './types';
import {
  checkRole,
  checkAnyRole,
  checkAllRoles,
  checkGroup,
  checkAnyGroup,
  checkAllGroups
} from './authorization';

// Retorna funcoes auxiliares de autorizacao conectadas a store do Keycloak
export function usePermissions<TRole extends string = string>(
  customStore?: Partial<ReturnType<typeof useKeycloakStore>> | Record<string, any>
): UsePermissionsReturn<TRole> {
  const store = customStore || useKeycloakStore();

  const hasRole = (role: TRole | string): boolean => {
    if (store?.is_superuser) return true;
    return checkRole(store?.roles, role);
  };

  const hasAnyRole = (roles: readonly (TRole | string)[]): boolean => {
    if (store?.is_superuser) return true;
    return checkAnyRole(store?.roles, roles);
  };

  const hasAllRoles = (roles: readonly (TRole | string)[]): boolean => {
    if (store?.is_superuser) return true;
    return checkAllRoles(store?.roles, roles);
  };

  const hasGroup = (group: string): boolean => {
    if (store?.is_superuser) return true;
    return checkGroup(store?.groups, group);
  };

  const hasAnyGroup = (groups: readonly string[]): boolean => {
    if (store?.is_superuser) return true;
    return checkAnyGroup(store?.groups, groups);
  };

  const hasAllGroups = (groups: readonly string[]): boolean => {
    if (store?.is_superuser) return true;
    return checkAllGroups(store?.groups, groups);
  };

  return {
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasGroup,
    hasAnyGroup,
    hasAllGroups
  };
}