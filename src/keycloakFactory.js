// src/keycloakFactory.js
import Keycloak from "keycloak-js";

/**
 * Cria uma nova instância do Keycloak.
 * @param {object} options - Configurações do Keycloak.
 * @param {string} options.url - A URL do seu servidor Keycloak.
 * @param {string} options.realm - O realm que você quer usar.
 * @param {string} options.clientId - O ID do cliente.
 * @returns A instância do Keycloak.
 */
export function createKeycloak(options) {
  if (!options || !options.url || !options.realm || !options.clientId) {
    throw new Error('As opções url, realm e clientId são obrigatórias para criar a instância do Keycloak.');
  }
  return new Keycloak(options);
}