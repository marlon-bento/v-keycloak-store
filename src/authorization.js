export function normalizeAccessItem(item) {
  if (typeof item !== 'string') return '';
  return item.replace(/^\/+|\/+$/g, '').split('/').pop().toUpperCase();
}

export function checkRole(userRoles, requiredRole) {
  if (!userRoles || !requiredRole) return false;
  const normalizedRequired = normalizeAccessItem(requiredRole);
  return userRoles.some(role => normalizeAccessItem(role) === normalizedRequired);
}

export function checkAnyRole(userRoles, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some(role => checkRole(userRoles, role));
}

export function checkAllRoles(userRoles, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.every(role => checkRole(userRoles, role));
}

export function checkGroup(userGroups, requiredGroup) {
  if (!userGroups || !requiredGroup) return false;
  const normalizedRequired = normalizeAccessItem(requiredGroup);
  return userGroups.some(group => normalizeAccessItem(group) === normalizedRequired);
}

export function checkAnyGroup(userGroups, requiredGroups) {
  if (!requiredGroups || requiredGroups.length === 0) return true;
  return requiredGroups.some(group => checkGroup(userGroups, group));
}

export function checkAllGroups(userGroups, requiredGroups) {
  if (!requiredGroups || requiredGroups.length === 0) return true;
  return requiredGroups.every(group => checkGroup(userGroups, group));
}
