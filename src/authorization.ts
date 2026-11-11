// ========
// Funcoes puras para normalizacao e validacao de papeis (roles) e grupos (groups).
// Remove barras extras de caminhos hierarquicos e compara em caixa alta.
// ========

// Normaliza o nome de uma role ou caminho de grupo extraindo o ultimo segmento em maiusculas
export function normalizeAccessItem(item: unknown): string {
  if (typeof item !== 'string') return '';
  return item.replace(/^\/+|\/+$/g, '').split('/').pop()?.toUpperCase() ?? '';
}

// Verifica se o usuario possui um papel especifico
export function checkRole(userRoles?: readonly string[] | null, requiredRole?: string | null): boolean {
  if (!userRoles || !requiredRole) return false;
  const normalizedRequired = normalizeAccessItem(requiredRole);
  return userRoles.some((role) => normalizeAccessItem(role) === normalizedRequired);
}

// Verifica se o usuario possui pelo menos um dos papeis exigidos
export function checkAnyRole(userRoles?: readonly string[] | null, requiredRoles?: readonly string[] | null): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => checkRole(userRoles, role));
}

// Verifica se o usuario possui todos os papeis exigidos
export function checkAllRoles(userRoles?: readonly string[] | null, requiredRoles?: readonly string[] | null): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.every((role) => checkRole(userRoles, role));
}

// Verifica se o usuario pertence a um grupo especifico
export function checkGroup(userGroups?: readonly string[] | null, requiredGroup?: string | null): boolean {
  if (!userGroups || !requiredGroup) return false;
  const normalizedRequired = normalizeAccessItem(requiredGroup);
  return userGroups.some((group) => normalizeAccessItem(group) === normalizedRequired);
}

// Verifica se o usuario pertence a pelo menos um dos grupos exigidos
export function checkAnyGroup(userGroups?: readonly string[] | null, requiredGroups?: readonly string[] | null): boolean {
  if (!requiredGroups || requiredGroups.length === 0) return true;
  return requiredGroups.some((group) => checkGroup(userGroups, group));
}

// Verifica se o usuario pertence a todos os grupos exigidos
export function checkAllGroups(userGroups?: readonly string[] | null, requiredGroups?: readonly string[] | null): boolean {
  if (!requiredGroups || requiredGroups.length === 0) return true;
  return requiredGroups.every((group) => checkGroup(userGroups, group));
}