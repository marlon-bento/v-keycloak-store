// src/store.js

// ========
// Este arquivo define o estado global da autenticação usando Pinia.
// Ele armazena os dados do usuário logado, gerencia validações de acesso,
// sincroniza com a instância do Keycloak e mantém o log de deslogamentos.
// ========
import { defineStore } from "pinia";
import { computed, ref, toRaw } from "vue";
import CryptoJS from 'crypto-js';

export const useKeycloakStore = defineStore("keycloakStore", () => {
  // Variável numérica que define a quantidade máxima de logs armazenados para evitar estouro de memória.
  const LIMITE_LOGS = 200;
  // Variável de controle booleana para evitar cascatas de gravação.
  // É usada para garantir que apenas o gatilho original da falha seja registrado, bloqueando logs redundantes na mesma queda de sessão.
  const deslogamentoEmAndamento = ref(false);

  // Função responsável por registrar o log de deslogamento na memória do navegador.
  // Recebe uma string contendo o motivo da queda de sessão.
  // Devolve nada.
  // É usada para mantermos um histórico de debug seguro e localizarmos a causa do problema do usuário.
  function registrarLogDeslogamento(motivo, fatal = true) {
    // Se já estamos deslogando, interrompe a função instantaneamente e poupa a CPU.
    if (deslogamentoEmAndamento.value) return;
    if (fatal){
      // Aciona a trava para os próximos eventos da cascata.
      deslogamentoEmAndamento.value = true;
    }

    const dataAtual = new Date().toLocaleString();
    const urlAtual = window.location.href;
    const novoLog = { data: dataAtual, url: urlAtual, motivo: motivo, fatal: fatal };
    
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

  // Referência para a instância do Keycloak
  const keycloakInstance = ref(null);

  // Associa a instância do Keycloak ao estado global.
  // Recebe o objeto de instância do Keycloak.
  // Devolve nada.
  // É usada durante a inicialização do plugin para permitir que o Pinia interaja com a sessão.
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

  // Adiciona ou atualiza uma propriedade no objeto de extensão.
  // Recebe a chave em string e o valor de qualquer tipo.
  // Devolve nada.
  // É usada para guardar temporariamente dados adicionais sem sujar os campos padrão.
  function setExtend(key, value) {
    if (!extend.value.hasOwnProperty(key)) {
      extend.value[key] = value;
    } else {
      console.warn(`A chave "${key}" já existe no objeto de extensão. Use removeExtend() antes de adicionar novamente.`);
    }
  }
  // Remove uma propriedade do objeto de extensão.
  // Recebe a chave em string.
  // Devolve nada.
  // É usada para limpar dados auxiliares que não são mais necessários.
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


  // Executa o processo de saída do sistema.
  // Recebe opcionalmente uma string com o motivo do logout.
  // Devolve nada.
  // É usada para registrar o deslogamento e limpar a sessão de forma segura e padronizada no Keycloak.
  function logoutAction(motivo = null) {
    if (motivo) {
        registrarLogDeslogamento(motivo, true);
    } else {
        deslogamentoEmAndamento.value = true;
    }
    const kc = keycloakInstance.value ? toRaw(keycloakInstance.value) : null;
    if (!kc) return;

    if (kc) {
      kc.logout();
    }
  }

  // Lê e popula os dados do usuário no estado do Pinia.
  // Recebe nada.
  // Devolve nada.
  // É usada logo após o login ou renovação de token para manter os dados da interface sempre atualizados.
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

  // Zera completamente os dados do usuário no estado global.
  // Recebe nada.
  // Devolve nada.
  // É usada para limpar os resíduos de sessão quando o usuário é deslogado ou encontra um erro de validação.
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
  // Verifica se o usuário pertence aos grupos globais permitidos para usar o sistema.
  // Recebe nada.
  // Devolve um valor booleano, sendo true para permitido e false para negado.
  // É usada para proteger a entrada principal da aplicação contra usuários que logaram no Keycloak, mas não têm acesso ao sistema específico.
  function hasAccess() {
    const kc = keycloakInstance.value;
    if (is_superuser.value) return true;
    const parsed =
      kc && kc.idTokenParsed
        ? kc.idTokenParsed
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
  // Verifica se o usuário possui uma permissão de acesso específica.
  // Recebe uma string contendo o nome da permissão.
  // Devolve um valor booleano.
  // É usada em validações granulares de componentes para mostrar ou ocultar recursos específicos na tela.
  function has_perm(perm) {
    if (is_superuser.value) {
      return true;
    }
    return perms.value.find(
      (value) => value.toLowerCase() === perm.toLowerCase()
    );
  }
  // Verifica se o usuário é membro de um grupo específico.
  // Recebe uma string contendo o nome do grupo.
  // Devolve um valor booleano.
  // É usada para validar o nível de acesso do usuário em áreas que exigem pertencimento a um determinado grupo.
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
    id, username, first_name, name, email, is_staff, is_superuser, getDataKeycloak, is_memberof, has_perm, removeDataKeycloak, gravatar, extend, setExtend, removeExtend, perms, logoutAction, hasAccess,
    registrarLogDeslogamento
  };
});