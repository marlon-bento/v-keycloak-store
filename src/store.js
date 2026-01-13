// src/store.js
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import CryptoJS from 'crypto-js';

export const useKeycloakStore = defineStore("keycloakStore", () => {
  // Referência para a instância do Keycloak
  const keycloakInstance = ref(null);

  // AÇÃO PARA CONFIGURAR A INSTÂNCIA
  function setKeycloakInstance(instance) {
    keycloakInstance.value = instance;
  }
  

  const token = ref("");
  const token_decode = computed(() => {
    return token.value ? JSON.parse(atob(token.value.split(".")[1])) : null;
  });
  const isAuthenticated = computed(() => {
    return !!token.value;
  });
  /*-------------------- dados usuários ----------------*/
  const id = ref(null)
  const username = ref(null);
  const first_name = ref(null);
  const name = ref(null);
  const email = ref(null);
  /*-----------------------------------------------------*/

  const is_staff = ref(null)
  const is_superuser = ref(null)
  const perms = ref([]);
  const groups = ref([]);
  const roles = ref([]);
  const extend = ref({})


  function setExtend(key, value) {
    if (!extend.value.hasOwnProperty(key)) {
      extend.value[key] = value;
    }else {
      extend.value[key] = value;
    }
  }
  function removeExtend(key) {
    if (extend.value.hasOwnProperty(key)) {
      delete extend.value[key];
    }
  }
  const gravatar = computed(() => {
    if (!email.value) return null;
    const hashedEmail = CryptoJS.SHA256(email.value.trim().toLowerCase()).toString()
    return `https://www.gravatar.com/avatar/${hashedEmail}?d=identicon`
  });

  function logoutAction() {
    if (keycloakInstance.value) {
      keycloakInstance.value.logout();
    }
  }

  function getDataKeycloak() {
    if (!keycloakInstance.value) return;
    const keycloak = keycloakInstance.value;
    console.log("Keycloak Instance:", keycloak);
    token.value = keycloak.token || "";
    id.value = keycloak.idTokenParsed?.sub || null;
    username.value = keycloak.idTokenParsed?.preferred_username || null;
    name.value = keycloak.idTokenParsed?.name || null;
    email.value = keycloak.idTokenParsed?.email || null;
    groups.value = keycloak.idTokenParsed?.groups || [];
    roles.value = keycloak.idTokenParsed?.roles || [];
    console.log("User Groups:", groups.value);
    console.log("User Roles:", roles.value);

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
  }

  function hasAccess() {
    const keycloakInstance = keycloak
    if (is_superuser.value) return true;
    const parsed =
      keycloakInstance && keycloakInstance.idTokenParsed
        ? keycloakInstance.idTokenParsed
        : null;
    if (!parsed || !parsed.groups || !Array.isArray(parsed.groups))
      return false;
    const allowedGroups = import.meta.env.VITE_GROUPS_ALLOWED
      ? import.meta.env.VITE_GROUPS_ALLOWED.split(",").map((g) =>
        g.trim().toUpperCase()
      )
      : [];
    // Remove barras e normaliza nomes dos grupos
    const userGroups = parsed.groups.map((g) =>
      g
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .pop()
        .toUpperCase()
    );
    const isAllowed = allowedGroups.some((g) => userGroups.includes(g));
    return isAllowed;
  }

  function has_perm(perm) {
    if (is_superuser.value) {
      return true;
    }
    return perms.value.find(
      (value) => value.toLowerCase() === perm.toLowerCase()
    );
  }

  function is_memberof(group) {
    if (is_superuser.value) {
      return true;
    }
    if (!hasAccess()) {
      return false
    }
    return Array.isArray(groups.value) &&
      groups.value.some(
        (value) => value.toLowerCase() === group.toLowerCase()
      );
  }
  return {
    setKeycloakInstance,
    keycloakInstance,
    
    token, token_decode, groups, roles, isAuthenticated,
    id, username, first_name, name, email, is_staff, is_superuser, getDataKeycloak, is_memberof, has_perm, removeDataKeycloak, gravatar, extend, setExtend, removeExtend, perms, logoutAction, hasAccess
  };
});