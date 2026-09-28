import { useKeycloakStore } from './store.js';
import {
  checkRole,
  checkAnyRole,
  checkAllRoles,
  checkGroup,
  checkAnyGroup,
  checkAllGroups
} from './authorization.js';

export function usePermissions(customStore) {
  const store = customStore || useKeycloakStore();

  const hasRole = (role) => {
    return checkRole(store?.roles, role);
  };

  const hasAnyRole = (roles) => {
    return checkAnyRole(store?.roles, roles);
  };

  const hasAllRoles = (roles) => {
    return checkAllRoles(store?.roles, roles);
  };

  const hasGroup = (group) => {
    return checkGroup(store?.groups, group);
  };

  const hasAnyGroup = (groups) => {
    return checkAnyGroup(store?.groups, groups);
  };

  const hasAllGroups = (groups) => {
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
