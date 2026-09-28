import { defineStore } from "pinia";
import { computed, ref, toRaw } from "vue";
import CryptoJS from 'crypto-js';
import {
  checkRole,
  checkAnyRole,
  checkAllRoles,
  checkGroup,
  checkAnyGroup,
  checkAllGroups
} from './authorization.js';

// Define o estado global da autenticação usando Pinia.
// Armazena os dados do usuário autenticado, gerencia validações de acesso,
// sincroniza com a instância do Keycloak e mantém o histórico de deslogamentos.
export const useKeycloakStore = defineStore("keycloakStore", () => {
  // Limite máximo de registros no localStorage para evitar estouro de memória
  const LIMITE_LOGS = 200;

  // Trava para evitar cascatas de gravação redundantes na mesma queda de sessão
  const deslogamentoEmAndamento = ref(false);
  const modoDebug = ref(false);

  function setModoDebug(valor) {
    modoDebug.value = Boolean(valor);
  }

  function registrarLogDeslogamento(motivo, fatal = true) {
    if (deslogamentoEmAndamento.value) return;
    if (fatal) {
      deslogamentoEmAndamento.value = true;
    }

    const dataAtual = new Date().toLocaleString();
    const urlAtual = window.location.href;
    const novoLog = { data: dataAtual, url: urlAtual, motivo, fatal };
    
    let logsSalvos = [];
    const logsString = localStorage.getItem("historico_deslogamento");

    if (logsString) {
      try {
        logsSalvos = JSON.parse(logsString);
      } catch (e) {
        logsSalvos = [];
      }
    }

    logsSalvos.push(novoLog);

    if (logsSalvos.length > LIMITE_LOGS) {
      logsSalvos.shift();
    }

    localStorage.setItem("historico_deslogamento", JSON.stringify(logsSalvos));
  }

  const keycloakInstance = ref(null);

  function setKeycloakInstance(instance) {
    keycloakInstance.value = instance;
  }

  const token = ref("");
  const token_decode = computed(() => {
    return token.value ? JSON.parse(atob(token.value.split(".")[1])) : null;
  });
  const isAuthenticated = computed(() => {
    return Boolean(token.value);
  });

  const id = ref(null);
  const username = ref(null);
  const first_name = ref(null);
  const name = ref(null);
  const email = ref(null);

  const is_staff = ref(null);
  const is_superuser = ref(null);
  const perms = ref([]);
  const groups = ref([]);
  const roles = ref([]);
  const extend = ref({});

  function setExtend(key, value) {
    if (!Object.prototype.hasOwnProperty.call(extend.value, key)) {
      extend.value[key] = value;
      return;
    }
    console.warn(`A chave "${key}" já existe no objeto de extensão. Use removeExtend() antes de adicionar novamente.`);
  }

  function removeExtend(key) {
    if (Object.prototype.hasOwnProperty.call(extend.value, key)) {
      delete extend.value[key];
    }
  }

  const gravatar = computed(() => {
    if (!email.value) return null;
    const hashedEmail = CryptoJS.SHA256(email.value.trim().toLowerCase()).toString();
    return `https://www.gravatar.com/avatar/${hashedEmail}?d=identicon`;
  });

  function logoutAction(motivo = null) {
    if (motivo) {
      registrarLogDeslogamento(motivo, true);
    } else {
      deslogamentoEmAndamento.value = true;
    }
    const kc = keycloakInstance.value ? toRaw(keycloakInstance.value) : null;
    if (!kc) return;
    kc.logout();
  }

  function getDataKeycloak() {
    if (!keycloakInstance.value) return false;
    
    const keycloak = keycloakInstance.value;
    if (modoDebug.value) {
      console.log("Keycloak Instance:", keycloak);
    }
    
    token.value = keycloak.token || "";
    id.value = keycloak.idTokenParsed?.sub || null;
    username.value = keycloak.idTokenParsed?.preferred_username || null;
    name.value = keycloak.idTokenParsed?.name || null;
    email.value = keycloak.idTokenParsed?.email || null;
    groups.value = keycloak.idTokenParsed?.groups || [];
    roles.value = keycloak.idTokenParsed?.roles || [];
    
    if (modoDebug.value) {
      console.log("User Groups:", groups.value);
      console.log("User Roles:", roles.value);
    }

    return true;
  }

  function removeDataKeycloak() {
    token.value = "";
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

  function hasAccess() {
    const kc = keycloakInstance.value;
    if (is_superuser.value) return true;
    const parsed = kc && kc.idTokenParsed ? kc.idTokenParsed : null;
    if (!parsed || !parsed.groups || !Array.isArray(parsed.groups)) return false;

    const allowedGroups = import.meta.env.VITE_GROUPS_ALLOWED
      ? import.meta.env.VITE_GROUPS_ALLOWED.split(",").map((g) => g.trim().toUpperCase())
      : [];

    const userGroups = parsed.groups.map((g) =>
      g.replace(/^\/+|\/+$/g, "").split("/").pop().toUpperCase()
    );
    return allowedGroups.some((g) => userGroups.includes(g));
  }

  function has_perm(perm) {
    if (is_superuser.value) return true;
    return perms.value.find(
      (value) => value.toLowerCase() === perm.toLowerCase()
    );
  }

  function is_memberof(group) {
    if (is_superuser.value) return true;
    if (!hasAccess()) return false;
    return checkGroup(groups.value, group);
  }

  function hasRole(role) {
    if (is_superuser.value) return true;
    return checkRole(roles.value, role);
  }

  function hasAnyRole(requiredRoles) {
    if (is_superuser.value) return true;
    return checkAnyRole(roles.value, requiredRoles);
  }

  function hasAllRoles(requiredRoles) {
    if (is_superuser.value) return true;
    return checkAllRoles(roles.value, requiredRoles);
  }

  function hasGroup(group) {
    if (is_superuser.value) return true;
    return checkGroup(groups.value, group);
  }

  function hasAnyGroup(requiredGroups) {
    if (is_superuser.value) return true;
    return checkAnyGroup(groups.value, requiredGroups);
  }

  function hasAllGroups(requiredGroups) {
    if (is_superuser.value) return true;
    return checkAllGroups(groups.value, requiredGroups);
  }

  return {
    setKeycloakInstance,
    keycloakInstance,
    setModoDebug,
    token,
    token_decode,
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