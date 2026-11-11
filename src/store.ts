// ========
// Store global Pinia para gerenciamento reativo da sessao OIDC/Keycloak.
// Armazena tokens, dados do perfil do usuario, papeis, grupos, cabecalho HTTP
// de autorizacao e historico local de diagnostico de desconexoes.
// ========

import { defineStore } from 'pinia';
import { computed, ref, shallowRef, toRaw } from 'vue';
import CryptoJS from 'crypto-js';
import { parseJwt } from './jwt';
import type { KeycloakAdapter, JwtPayload, KeycloakLoginOptions } from './types';
import {
  checkRole,
  checkAnyRole,
  checkAllRoles,
  checkGroup,
  checkAnyGroup,
  checkAllGroups
} from './authorization';

interface LogDeslogamento {
  data: string;
  url: string;
  motivo: string;
  fatal: boolean;
}

export const useKeycloakStore = defineStore('keycloakStore', () => {
  // Quantidade maxima de registros de desconexao mantidos no localStorage
  const LIMITE_LOGS = 200;

  const deslogamentoEmAndamento = ref(false);
  const modoDebug = ref(false);

  // Ativa ou desativa a exibicao de logs detalhados no console
  function setModoDebug(valor: boolean): void {
    modoDebug.value = Boolean(valor);
  }

  // Salva um registro de auditoria no localStorage detalhando o motivo do encerramento da sessao
  function registrarLogDeslogamento(motivo: string, fatal = true): void {
    if (deslogamentoEmAndamento.value) return;
    if (fatal) {
      deslogamentoEmAndamento.value = true;
    }

    const dataAtual = new Date().toLocaleString();
    const urlAtual = typeof window !== 'undefined' ? window.location.href : '';
    const novoLog: LogDeslogamento = { data: dataAtual, url: urlAtual, motivo, fatal };

    let logsSalvos: LogDeslogamento[] = [];
    if (typeof localStorage !== 'undefined') {
      const logsString = localStorage.getItem('historico_deslogamento');
      if (logsString) {
        try {
          logsSalvos = JSON.parse(logsString);
        } catch {
          logsSalvos = [];
        }
      }

      logsSalvos.push(novoLog);

      if (logsSalvos.length > LIMITE_LOGS) {
        logsSalvos.shift();
      }

      localStorage.setItem('historico_deslogamento', JSON.stringify(logsSalvos));
    }
  }

  // Referencia superficial para a instancia adaptadora evitando proxy profundo sobre o UserManager
  const keycloakInstance = shallowRef<KeycloakAdapter | null>(null);

  // Vincula a instancia do adaptador Keycloak na store
  function setKeycloakInstance(instance: KeycloakAdapter): void {
    keycloakInstance.value = instance;
  }

  // Token JWT bruto da sessao ativa
  const token = ref('');

  // Payload decodificado do JWT (mantido com nome legado e alias moderno)
  const token_decode = computed<JwtPayload | null>(() => {
    return token.value ? parseJwt(token.value) : null;
  });
  const tokenParsed = computed<JwtPayload | null>(() => token_decode.value);

  // Indica se ha um token ativo carregado na store
  const isAuthenticated = computed<boolean>(() => {
    return Boolean(token.value);
  });

  // Objeto pronto para ser injetado em headers de requisicoes HTTP (Axios / Fetch)
  const authHeader = computed<{ Authorization?: string }>(() => {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {};
  });

  const id = ref<string | null>(null);
  const username = ref<string | null>(null);
  const first_name = ref<string | null>(null);
  const name = ref<string | null>(null);
  const email = ref<string | null>(null);

  const is_staff = ref<boolean | null>(null);
  const is_superuser = ref<boolean | null>(null);
  const perms = ref<string[]>([]);
  const groups = ref<string[]>([]);
  const roles = ref<string[]>([]);
  const extend = ref<Record<string, unknown>>({});

  // Adiciona uma propriedade customizada ao estado estendido da store
  function setExtend(key: string, value: unknown): void {
    if (!Object.prototype.hasOwnProperty.call(extend.value, key)) {
      extend.value[key] = value;
      return;
    }
    console.warn(`A chave "${key}" já existe no objeto de extensão. Use removeExtend() antes de adicionar novamente.`);
  }

  // Remove uma propriedade customizada previamente adicionada em extend
  function removeExtend(key: string): void {
    if (Object.prototype.hasOwnProperty.call(extend.value, key)) {
      delete extend.value[key];
    }
  }

  // Gera a URL de avatar do Gravatar usando hash SHA256 do e-mail do usuario
  const gravatar = computed<string | null>(() => {
    if (!email.value) return null;
    const hashedEmail = CryptoJS.SHA256(email.value.trim().toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hashedEmail}?d=identicon`;
  });

  // Limpa os dados locais e aciona o encerramento de sessao no servidor OIDC
  function logoutAction(motivo: string | null = null): void {
    if (motivo) {
      registrarLogDeslogamento(motivo, true);
    } else {
      deslogamentoEmAndamento.value = true;
    }
    const kc = keycloakInstance.value ? toRaw(keycloakInstance.value) : null;
    removeDataKeycloak();
    if (!kc) return;
    kc.logout();
  }

  // Extrai claims, grupos e roles dos tokens da instancia OIDC e sincroniza o estado reativo
  function getDataKeycloak(): boolean {
    if (!keycloakInstance.value) return false;

    const keycloak = keycloakInstance.value;
    if (modoDebug.value) {
      console.log('Keycloak / OIDC Instance:', keycloak);
    }

    token.value = keycloak.token || '';

    const idClaims = keycloak.idTokenParsed || {};
    const accessClaims = keycloak.tokenParsed || parseJwt(token.value) || {};

    id.value = idClaims.sub || accessClaims.sub || null;
    username.value = idClaims.preferred_username || accessClaims.preferred_username || null;
    first_name.value = idClaims.given_name || accessClaims.given_name || null;
    name.value = idClaims.name || accessClaims.name || null;
    email.value = idClaims.email || accessClaims.email || null;

    const rawGroups = idClaims.groups || accessClaims.groups || [];
    groups.value = Array.isArray(rawGroups) ? rawGroups : [];

    const extractedRoles = new Set<string>([
      ...(Array.isArray(idClaims.roles) ? idClaims.roles : []),
      ...(Array.isArray(accessClaims.roles) ? accessClaims.roles : []),
      ...(Array.isArray(idClaims.realm_access?.roles) ? idClaims.realm_access.roles : []),
      ...(Array.isArray(accessClaims.realm_access?.roles) ? accessClaims.realm_access.roles : []),
      ...(keycloak.clientId && Array.isArray(accessClaims.resource_access?.[keycloak.clientId]?.roles)
        ? accessClaims.resource_access[keycloak.clientId].roles!
        : [])
    ]);

    roles.value = Array.from(extractedRoles);
    deslogamentoEmAndamento.value = false;

    if (modoDebug.value) {
      console.log('User Groups:', groups.value);
      console.log('User Roles:', roles.value);
    }

    return true;
  }

  // Reseta todas as propriedades reativas da sessao para seus valores iniciais vazios
  function removeDataKeycloak(): void {
    token.value = '';
    id.value = null;
    username.value = null;
    first_name.value = null;
    name.value = null;
    email.value = null;

    is_staff.value = null;
    is_superuser.value = null;

    extend.value = {};
    perms.value = [];
    groups.value = [];
    roles.value = [];
  }

  // Verifica se o usuario pertence aos grupos permitidos definidos em VITE_GROUPS_ALLOWED
  function hasAccess(): boolean {
    if (is_superuser.value) return true;
    if (!Array.isArray(groups.value)) return false;

    const envGroups = (typeof import.meta !== 'undefined' && import.meta.env)
      ? import.meta.env.VITE_GROUPS_ALLOWED
      : undefined;

    const allowedGroups = envGroups
      ? String(envGroups).split(',').map((g) => g.trim().toUpperCase())
      : [];

    if (allowedGroups.length === 0) return false;

    const userGroups = groups.value.map((g) =>
      (g.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '').toUpperCase()
    );
    return allowedGroups.some((g) => userGroups.includes(g));
  }

  // Verifica permissao legada na lista perms
  function has_perm(perm: string): boolean | string | undefined {
    if (is_superuser.value) return true;
    return perms.value.find(
      (value) => value.toLowerCase() === perm.toLowerCase()
    );
  }

  // Verifica pertencimento a grupo exigindo tambem validacao em hasAccess
  function is_memberof(group: string): boolean {
    if (is_superuser.value) return true;
    if (!hasAccess()) return false;
    return checkGroup(groups.value, group);
  }

  // Verifica se o usuario possui um papel especifico
  function hasRole(role: string): boolean {
    if (is_superuser.value) return true;
    return checkRole(roles.value, role);
  }

  // Verifica se o usuario possui ao menos um dos papeis informados
  function hasAnyRole(requiredRoles: readonly string[]): boolean {
    if (is_superuser.value) return true;
    return checkAnyRole(roles.value, requiredRoles);
  }

  // Verifica se o usuario possui todos os papeis informados
  function hasAllRoles(requiredRoles: readonly string[]): boolean {
    if (is_superuser.value) return true;
    return checkAllRoles(roles.value, requiredRoles);
  }

  // Verifica se o usuario pertence a um grupo especifico
  function hasGroup(group: string): boolean {
    if (is_superuser.value) return true;
    return checkGroup(groups.value, group);
  }

  // Verifica se o usuario pertence a ao menos um dos grupos informados
  function hasAnyGroup(requiredGroups: readonly string[]): boolean {
    if (is_superuser.value) return true;
    return checkAnyGroup(groups.value, requiredGroups);
  }

  // Verifica se o usuario pertence a todos os grupos informados
  function hasAllGroups(requiredGroups: readonly string[]): boolean {
    if (is_superuser.value) return true;
    return checkAllGroups(groups.value, requiredGroups);
  }
  // Inicia o fluxo de login padrao ou customizado (Redirect ou Popup com Overlay)
  async function loginAction(options?: KeycloakLoginOptions): Promise<void> {
    const kc = keycloakInstance.value ? toRaw(keycloakInstance.value) : null;
    if (!kc) return;
    await kc.login(options);
    getDataKeycloak();
  }
  // Abre diretamente a janela de login em Popup e sincroniza os dados na store
  async function loginPopupAction(): Promise<void> {
    const kc = keycloakInstance.value ? toRaw(keycloakInstance.value) : null;
    if (!kc) return;
    await kc.loginPopup();
    getDataKeycloak();
  }

  return {
    setKeycloakInstance,
    loginAction,
    loginPopupAction,
    keycloakInstance,
    setModoDebug,
    token,
    token_decode,
    tokenParsed,
    authHeader,
    groups,
    roles,
    isAuthenticated,
    id,
    username,
    first_name,
    name,
    email,
    is_staff,
    is_superuser,
    getDataKeycloak,
    is_memberof,
    has_perm,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasGroup,
    hasAnyGroup,
    hasAllGroups,
    removeDataKeycloak,
    gravatar,
    extend,
    setExtend,
    removeExtend,
    perms,
    logoutAction,
    hasAccess,
    registrarLogDeslogamento
  };
});