// ========
// Ponto de entrada principal da biblioteca v-keycloak-store.
// Exporta a fabrica OIDC, store Pinia, plugin Vue, guardiao de rotas, composable e tipos.
// ========

export { createKeycloak, parseJwt } from './keycloakFactory';
export { useKeycloakStore } from './store';
export { KeycloakPlugin } from './plugin';
export { usePermissions } from './usePermissions';
export { createAuthGuard } from './guard';
export type * from './types';