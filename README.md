# v-keycloak-store

> Plugin completo de autenticação OIDC/Keycloak e autorização RBAC para **Vue 3**, escrito 100% em **TypeScript** e construído sobre **oidc-client-ts**, **Vue Router 4** e **Pinia**.

Gerencia todo o ciclo de vida da sessão do usuário de forma reativa e transparente: suporta login via **Redirect** ou **Popup** (com componente Vue de bloqueio personalizável, aceitando componentes `.vue` customizados e destravamento inteligente ao fechar a janela), renova o token JWT automaticamente em segundo plano, sincroniza login e logout entre **múltiplas abas e múltiplos sistemas em SSO**, protege rotas declarativamente (com auto-recuperação de erro 403 e configuração de rotas de pós-login e pós-logout pelo nome/path) e oferece diretivas de template avançadas (`v-can` / `v-has` com `.all`, `.not` e `.disable`).

---

## Sumário

1. [Instalação e Dependências](#1-instalação-e-dependências)
2. [Guia de Início Rápido (Quickstart)](#2-guia-de-início-rápido-quickstart)
3. [Guia de Uso Passo a Passo](#3-guia-de-uso-passo-a-passo)
   - [3.1. Inicialização do Plugin e Redirecionamento Automático](#31-inicialização-do-plugin-e-redirecionamento-automático)
   - [3.2. Login em Janela Popup (Padrão e com Componente Vue Customizado)](#32-login-em-janela-popup-padrão-e-com-componente-vue-customizado)
   - [3.3. Segurança de Armazenamento e Sincronização de Abas / SSO](#33-segurança-de-armazenamento-e-sincronização-de-abas--sso)
   - [3.4. Proteção de Rotas e Permissões no Vue Router](#34-proteção-de-rotas-e-permissões-no-vue-router)
   - [3.5. Tratamento Inteligente de Erro 403 (Auto-Recuperação)](#35-tratamento-inteligente-de-erro-403-auto-recuperação)
   - [3.6. Regras Customizadas na Rota (Feature Flags, Tenants, etc.)](#36-regras-customizadas-na-rota-feature-flags-tenants-etc)
   - [3.7. Diretivas `v-can` e `v-has` (Esconder ou Desabilitar Elementos)](#37-diretivas-v-can-e-v-has-esconder-ou-desabilitar-elementos)
   - [3.8. Composable `usePermissions` (Checagem no Script)](#38-composable-usepermissions-checagem-no-script)
   - [3.9. Store Global (`useKeycloakStore`), Ações de Login/Logout e Requisições de API (`authHeader`)](#39-store-global-usekeycloakstore-ações-de-loginlogout-e-requisições-de-api-authheader)
4. [Referência Completa de Configuração e API](#4-referência-completa-de-configuração-e-api)
   - [`createKeycloak(options)`](#createkeycloakoptions)
   - [`PopupOverlayOptions` e Props do Componente Customizado](#popupoverlayoptions-e-props-do-componente-customizado)
   - [`KeycloakPlugin`](#keycloakplugin)
   - [`usePermissions<TRole>()`](#usepermissionstrole)
   - [`createAuthGuard(options)`](#createauthguardoptions)
   - [`useKeycloakStore()`](#usekeycloakstore)
   - [Tipagens Automáticas (`RouteMeta` e `GlobalDirectives`)](#tipagens-automáticas-routemeta-e-globaldirectives)
5. [Resolução de Problemas Comuns (FAQ)](#5-resolução-de-problemas-comuns-faq)

---

## 1. Instalação e Dependências

A partir da versão **2.0.0**, a biblioteca é compilada em TypeScript com estilos encapsulados (você não precisa importar nenhum arquivo `.css` separado) e já traz o motor OIDC moderno (`oidc-client-ts`) embutido:

```bash
npm install v-keycloak-store
```

Certifique-se de que o seu projeto atende aos requisitos mínimos (*peerDependencies*):
- `vue`: `>= 3.4.0`
- `vue-router`: `>= 4.3.0`
- `pinia`: `>= 2.1.0`

---

## 2. Guia de Início Rápido (Quickstart)

Veja como configurar a autenticação completa no seu arquivo `src/main.ts`:

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { createKeycloak, KeycloakPlugin } from 'v-keycloak-store';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 1. Cria a instância de conexão com o servidor Keycloak
const keycloak = createKeycloak({
  url: 'https://auth.minhainstituicao.com.br',
  realm: 'meu-realm',
  clientId: 'meu-sistema-web',
  loginMode: 'redirect', // 'redirect' (padrão) ou 'popup'
  storage: 'localStorage' // 'localStorage' (padrão) ou 'sessionStorage'
});

// 2. Instala o plugin que conecta tudo ao Router e ao Pinia
app.use(KeycloakPlugin, {
  keycloak,
  router,
  optionsKeycloak: {
    onLoad: 'login-required' // Força login ao abrir, ou use 'check-sso' se tiver páginas públicas
  },
  loginRoute: { name: 'admin' }, // Opcional: se omitido, volta automaticamente para a URL exata onde o usuário estava (suportando subpaths como /panel)
  forbiddenRoute: { name: 'error-403' },
  logoutRoute: { name: 'home-publica' }, // Opcional: rota para onde enviar após deslogar
  onReady: () => {
    app.mount('#app');
  }
});
```

---

## 3. Guia de Uso Passo a Passo

### 3.1. Inicialização do Plugin e Redirecionamento Automático

Ao registrar o `KeycloakPlugin`, você não precisa criar guardiões de rota manualmente nem configurar timers de renovação de token. O plugin faz tudo sozinho:
1. Inicializa a sessão e limpa códigos temporários da URL (`?code=...&state=...`) sem recarregar a página.
2. **Suporte Nativo a Subpaths (`/panel`, `/admin`, etc.):** Se você não definir `loginRoute` nem `redirectUri`, o padrão automático é `window.location.origin + window.location.pathname` (preservando também a query string via `state.targetUrl`). Ou seja, se o usuário abrir `https://site.com.br/panel/noticias`, ele vai para o Keycloak e volta exatamente para `https://site.com.br/panel/noticias` sem cair na raiz `/` por engano.
3. Unifica todas as roles do usuário (sejam elas do *Realm* ou específicas do *Client*) dentro da store do Pinia.
4. Registra as diretivas `v-can` e `v-has` globalmente.
5. Renova o token silenciosamente antes de vencer e monitora quedas de sessão SSO.
6. Resolve automaticamente as rotas configuradas em `loginRoute` e `logoutRoute` (aceitando `{ name: '...' }` ou `{ path: '...' }`) para a URL completa exigida pelo servidor OIDC.

```typescript
app.use(KeycloakPlugin, {
  keycloak,
  router,
  optionsKeycloak: {
    onLoad: 'check-sso' // Permite navegar em rotas públicas sem exigir login imediato
  },
  refreshTimeout: 90000, // Checa a validade do token a cada 90 segundos (padrão)
  loginRoute: { name: 'dashboard' }, // Opcional: força uma rota específica após o login
  forbiddenRoute: { name: 'error-403' }, // Para onde enviar o usuário sem permissão
  logoutRoute: { name: 'validar' }, // Para onde enviar o usuário após sair ou perder a sessão
  rolesMode: 'any', // Padrão das rotas: 'any' (basta ter uma role) ou 'all' (exige todas)
  groupsMode: 'any', // Padrão para grupos nas rotas: 'any' ou 'all'
  debug: false // Mude para true durante o desenvolvimento para ver logs detalhados no console
});
```

---

### 3.2. Login em Janela Popup (Padrão e com Componente Vue Customizado)

Se você não quiser que o navegador saia da sua aplicação para ir até a tela do Keycloak, defina `loginMode: 'popup'` no `createKeycloak`.

Quando o usuário tentar acessar uma rota protegida, a biblioteca montará automaticamente um **Overlay Vue** sobre a tela. Ao clicar no botão de login, a janela pop-up do Keycloak se abre.
- **Destravamento Inteligente:** Se o usuário fechar o pop-up no botão "X" sem concluir o login, a biblioteca detecta imediatamente que o foco voltou para a janela principal e atualiza o estado para `tentarNovamente = true` e `carregando = false`, destravando o botão na hora sem precisar dar F5.

#### Opção A: Usando o Card Padrão Personalizável
Você pode customizar textos, cores e logotipo do componente nativo `PopupOverlay.vue`:

```typescript
const keycloak = createKeycloak({
  url: 'https://auth.minhainstituicao.com.br',
  realm: 'meu-realm',
  clientId: 'meu-sistema-web',
  loginMode: 'popup',
  popupOverlay: {
    title: 'Identificação Necessária',
    message: 'Utilize sua conta institucional para acessar o sistema.',
    waitingMessage: 'Conclua o login na janela que se abriu...',
    retryMessage: 'A janela de login foi fechada. Clique abaixo para tentar novamente:',
    buttonText: 'Entrar com Conta Institucional',
    waitingButtonText: 'Aguardando login...',
    logoUrl: '/logo-universidade.svg',
    backgroundColor: 'rgba(11, 28, 46, 0.92)',
    cardBackgroundColor: '#ffffff',
    textColor: '#102A43',
    primaryColor: '#2563eb'
  }
});
```

#### Opção B: Usando o seu próprio Componente Vue (`component: MeuPopup.vue`)
Não quer usar o layout padrão nem escrever HTML em strings? Crie um componente `.vue` normal no seu projeto com as classes do seu Design System (Tabler, Sistec, Tailwind, Vuetify, etc.) e passe-o na propriedade **`component`**.

O seu componente receberá automaticamente as props reativas **`carregando`** (`boolean`), **`tentarNovamente`** (`boolean`), **`opcoes`** e poderá disparar a abertura do pop-up emitindo **`@acionarLogin`** (ou chamando a prop `acionarLogin()`):

**1. Crie o seu componente (`src/components/LoginPopupCustom.vue`):**
```vue
<script setup lang="ts">
defineProps<{
  carregando: boolean;
  tentarNovamente: boolean;
}>();

const emit = defineEmits<{
  (e: 'acionarLogin'): void;
}>();
</script>

<template>
  <div class="vkc-custom-backdrop page page-center w-100">
    <div class="container container-tight py-4">
      <div class="card card-md shadow-lg border-0">
        <div class="card-status-top bg-primary"></div>
        <div class="card-body text-center py-5">
          <img src="/logos/logo-escura.png" height="36" class="mb-4" alt="Logo" />
          <h2 class="h2 mb-2">Acesso Restrito</h2>

          <p class="text-secondary mb-4">
            <template v-if="carregando">
              Conclua a autenticação na janela que se abriu...
            </template>
            <template v-else-if="tentarNovamente">
              A janela de login foi fechada. Clique abaixo para tentar novamente:
            </template>
            <template v-else>
              Autentique-se na janela pop-up para acessar o painel.
            </template>
          </p>

          <button
            type="button"
            class="btn btn-primary w-100 py-2"
            :disabled="carregando"
            @click="emit('acionarLogin')"
          >
            {{ carregando ? 'Aguardando login...' : 'Autenticar agora' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vkc-custom-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: rgba(11, 28, 46, 0.92);
  backdrop-filter: blur(6px);
}
</style>
```

**2. Passe o componente no `createKeycloak` (`src/main.ts`):**
```typescript
import LoginPopupCustom from './components/LoginPopupCustom.vue';

const keycloak = createKeycloak({
  url: 'https://auth.minhainstituicao.com.br',
  realm: 'meu-realm',
  clientId: 'meu-sistema-web',
  loginMode: 'popup',
  popupOverlay: {
    component: LoginPopupCustom
  }
});
```

#### Opção C: Controle Programático via Função (`customHandler`)
Caso prefira controlar o disparo por conta própria via código:

```typescript
const keycloak = createKeycloak({
  url: 'https://auth.minhainstituicao.com.br',
  realm: 'meu-realm',
  clientId: 'meu-sistema-web',
  loginMode: 'popup',
  popupOverlay: {
    customHandler: async ({ triggerPopup }) => {
      await triggerPopup();
    }
  }
});
```

---

### 3.3. Segurança de Armazenamento e Sincronização de Abas / SSO

A biblioteca foi projetada para funcionar perfeitamente em ambientes corporativos e universitários com múltiplos sistemas integrados ao mesmo Keycloak:

#### 1. Sincronização Instantânea entre Abas da Mesma Aplicação
Quando `storage: 'localStorage'` (padrão) está ativo:
- Se o usuário estiver com **3 abas abertas** do seu sistema e clicar em **"Sair"** na Aba 1, as Abas 2 e 3 detectam a saída no mesmo instante, limpam os dados da memória e redirecionam para `logoutRoute` (ou bloqueiam a tela caso esteja em uma rota protegida).
- Se o token for renovado na Aba 1, as outras abas recebem o token novo imediatamente via evento de storage.

#### 2. Logout Inteligente entre Sistemas Diferentes (Single Sign-Out / SSO)
Imagine que o usuário está logado no **Sistema Acadêmico (Aba 1)** e no **Sistema Financeiro (Aba 2)**, ambos usando o mesmo Keycloak. Se ele fizer logout no Sistema Financeiro:
- O monitoramento de sessão (`monitorSession: true` ativo por padrão) e a verificação automática de visibilidade/foco da aba detectam que a sessão no servidor Keycloak foi encerrada.
- A store local é limpa imediatamente e o usuário é redirecionado para a rota definida em `logoutRoute` (ou enviado para o login caso `logoutRoute` não tenha sido definida e ele esteja em uma rota protegida), evitando que preencha formulários em uma "sessão morta".

#### 3. Qual `storage` escolher? (`localStorage` vs `sessionStorage`)
- **`storage: 'localStorage'` (Padrão):** Mantém o usuário logado entre abas e recarregamentos do navegador. Ideal para sistemas administrativos internos onde cada colaborador usa sua própria máquina.
- **`storage: 'sessionStorage'` (Recomendado para Laboratórios e Terminais Compartilhados):** Se o sistema é acessado em computadores compartilhados, use `'sessionStorage'`. Assim que a aba ou navegador é fechado, o token é destruído imediatamente.

---

### 3.4. Proteção de Rotas e Permissões no Vue Router

Você protege suas páginas adicionando propriedades tipadas dentro do objeto `meta` de cada rota. Rotas filhas herdam e somam regras com as rotas pais:

```typescript
import { createRouter, createWebHistory } from 'vue-router';

export enum AppRoles {
  GerenciarEquipamentos = 'INVENTARIO_MANAGE_EQUIPAMENTO',
  VisualizarEquipamentos = 'INVENTARIO_VIEW_EQUIPAMENTO',
  Coordenador = 'COORDENADOR'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/institucional',
      component: PublicView
      // Sem meta.requiresAuth: qualquer pessoa acessa sem precisar logar
    },
    {
      path: '/perfil',
      component: PerfilView,
      meta: {
        requiresAuth: true // Exige apenas estar logado (qualquer papel ou grupo)
      }
    },
    {
      path: '/inventario',
      component: InventarioLayout,
      meta: {
        requiresAuth: true,
        // Permite entrar se tiver GERENCIAR *OU* VISUALIZAR:
        roles: [AppRoles.GerenciarEquipamentos, AppRoles.VisualizarEquipamentos],
        rolesMode: 'any',
        // E também exige pertencer ao grupo 'ti' ou 'patrimonio':
        groups: ['ti', 'patrimonio'],
        groupsMode: 'any'
      },
      children: [
        {
          path: 'aprovar-baixa',
          component: AprovarBaixaView,
          meta: {
            // Na rota filha, exige ter GERENCIAR *E* COORDENADOR ao mesmo tempo:
            roles: [AppRoles.GerenciarEquipamentos, AppRoles.Coordenador],
            rolesMode: 'all'
          }
        }
      ]
    },
    {
      path: '/acesso-negado',
      name: 'error-403',
      component: () => import('@/views/Error403View.vue')
    }
  ]
});
```

> **Dica:** A biblioteca normaliza automaticamente caminhos hierárquicos de grupos e letras maiúsculas/minúsculas! Se o Keycloak devolver o grupo como `"/departamentos/ti/"` e na rota você escrever apenas `'TI'` ou `'ti'`, a validação funcionará perfeitamente.

---

### 3.5. Tratamento Inteligente de Erro 403 (Auto-Recuperação)

Quando um usuário está logado, mas tenta entrar em uma rota para a qual não tem papel (`role`) ou grupo (`group`):
1. A navegação é bloqueada e ele é enviado para a sua rota configurada em `forbiddenRoute` (ex: `/acesso-negado?redirect=/inventario/aprovar-baixa`).
2. **Auto-Recuperação:** Se o administrador liberar a permissão para esse usuário no Keycloak e o usuário atualizar a página de erro 403 (ou trocar de perfil), o guardião lê automaticamente o endereço guardado em `?redirect=...`, percebe que agora ele tem permissão e **redireciona o usuário sozinho de volta para a tela que ele tentava abrir**.

---

### 3.6. Regras Customizadas na Rota (Feature Flags, Tenants, etc.)

Precisa validar algo além do Keycloak antes de abrir uma rota (como checar na sua API se uma *Feature Flag* está ativa)? Use a função `customRules`:

```typescript
app.use(KeycloakPlugin, {
  keycloak,
  router,
  forbiddenRoute: { name: 'error-403' },
  customRules: async (record, to) => {
    if (record.meta?.moduloBeta) {
      const configStore = useConfigStore();
      await configStore.garantirCarregamento();
      
      // Se retornar false, envia para a tela de 403.
      // Você também pode retornar um objeto de rota, ex: { name: 'em-breve' }
      return configStore.moduloAtivo(record.meta.moduloBeta as string);
    }
    return true; // Libera a navegação normal
  }
});
```

---

### 3.7. Diretivas `v-can` e `v-has` (Esconder ou Desabilitar Elementos)

Para controlar botões, menus e seções direto no `<template>`, use as diretivas **`v-can`** ou **`v-has`** (elas são sinônimas). Elas são **100% reativas e reversíveis**: se as permissões do usuário mudarem sem recarregar a página, os elementos voltam para a tela ou se atualizam sozinhos.

#### Modificadores disponíveis:
- **Sem modificador (Padrão `any`):** Mostra o elemento se o usuário tiver **pelo menos um** dos itens da lista. Se não tiver, substitui o elemento por um nó de comentário no DOM.
- **`.all`:** Exige que o usuário possua **todos** os papéis ou grupos passados no array.
- **`.not`:** Inverte a regra — mostra o elemento apenas para quem **NÃO** possui aquele papel ou grupo.
- **`.disable`:** Em vez de sumir com o botão da tela, mantém o botão visível porém **desabilitado** (`disabled`), com opacidade reduzida, cursor de bloqueio (`not-allowed`) e dica de tela (*tooltip*) explicando a falta de permissão.

```html
<!-- 1. Básico: Remove o botão do HTML se não tiver a role ADMIN -->
<button v-can:role="'ADMIN'">Configurações do Sistema</button>

<!-- 2. Lista (Modo ANY padrão): Mostra se for SECRETARIA *ou* COORDENADOR -->
<div v-can:role="['SECRETARIA', 'COORDENADOR']">
  Painel Acadêmico
</div>

<!-- 3. Modificador .all: Só mostra se for DOCENTE *e também* COORDENADOR -->
<button v-can:role.all="['DOCENTE', 'COORDENADOR']">
  Homologar Notas do Curso
</button>

<!-- 4. Modificador .disable: O botão continua na tela, mas fica desabilitado se não for ADMIN -->
<button v-can:role.disable="'ADMIN'" @click="excluirRegistro">
  Excluir Registro
</button>

<!-- 5. Modificador .not: Mostra este aviso APENAS para quem NÃO é do grupo 'ti' -->
<div v-has:group.not="'ti'" class="alerta-suporte">
  Precisa de acesso avançado? Abra um chamado para a equipe de TI.
</div>

<!-- 6. Combinando modificadores (.all + .disable): Desabilita se não tiver ambos os grupos -->
<button v-has:group.all.disable="['financeiro', 'auditoria']">
  Exportar Balanço Confidencial
</button>
```

---

### 3.8. Composable `usePermissions` (Checagem no Script)

Quando precisar verificar permissões dentro de `<script setup lang="ts">` ou em propriedades `computed`, utilize o composable `usePermissions()`:

```vue
<script setup lang="ts">
import { usePermissions } from 'v-keycloak-store';
import { AppRoles } from '@/constants/roles';

// Passe seu Enum ou Union Type no generic <AppRoles> para ter autocomplete estrito!
const {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasGroup,
  hasAnyGroup,
  hasAllGroups
} = usePermissions<AppRoles>();

function tentarSalvarFormulario() {
  if (!hasAnyRole([AppRoles.GerenciarEquipamentos, AppRoles.Coordenador])) {
    alert('Apenas gestores ou coordenadores podem salvar alterações.');
    return;
  }
  // Continua o salvamento...
}
</script>

<template>
  <button v-if="hasGroup('ti')" @click="tentarSalvarFormulario">
    Salvar Equipamento
  </button>
</template>
```

---

### 3.9. Store Global (`useKeycloakStore`), Ações de Login/Logout e Requisições de API (`authHeader`)

A store do Pinia guarda todas as informações do usuário logado, oferece o getter **`authHeader`** pronto para requisições HTTP e disponibiliza ações diretas (`loginAction`, `loginPopupAction` e `logoutAction`) para que você não precise importar a instância do Keycloak do `main.ts`:

```vue
<script setup lang="ts">
import { useKeycloakStore } from 'v-keycloak-store';

const authStore = useKeycloakStore();

// Dados reativos do usuário prontos para exibir no sistema:
console.log(authStore.isAuthenticated); // true ou false
console.log(authStore.name);            // Ex: "João da Silva"
console.log(authStore.username);        // Ex: "joao.silva"
console.log(authStore.email);           // Ex: "joao.silva@dominio.edu.br"
console.log(authStore.gravatar);        // URL da foto de perfil gerada pelo e-mail
console.log(authStore.roles);           // ['DOCENTE', 'COORDENADOR', ...]
console.log(authStore.groups);          // ['/academico/professores', ...]

// Usando o authHeader para enviar o token automaticamente para o seu Backend:
async function carregarRelatorio() {
  const resposta = await fetch('https://api.minhainstituicao.com.br/relatorios', {
    method: 'GET',
    headers: {
      ...authStore.authHeader, // Injeta "Authorization: Bearer eyJhbGci..."
      'Content-Type': 'application/json'
    }
  });
  return resposta.json();
}

// Fazendo logout seguro (salva o motivo no histórico de diagnóstico local):
function sairDoSistema() {
  authStore.logoutAction('Usuário clicou no botão Sair do menu principal');
}
</script>

<template>
  <div v-if="!authStore.isAuthenticated">
    <!-- Abre diretamente a janela Popup do Keycloak e sincroniza a store -->
    <button @click="authStore.loginPopupAction()">
      Entrar (Popup Direto)
    </button>

    <!-- Aciona o login padrão ou força modo Redirect passando opções -->
    <button @click="authStore.loginAction({ loginMode: 'redirect' })">
      Entrar (Redirect)
    </button>
  </div>

  <button v-else @click="sairDoSistema">
    Sair
  </button>
</template>
```

---

## 4. Referência Completa de Configuração e API

### `createKeycloak(options)`

Cria a instância adaptadora de conexão com o Keycloak (`KeycloakAdapter`).

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `url` | `string` | **Obrigatório** | URL base do servidor Keycloak (ex: `https://auth.dominio.com`). |
| `realm` | `string` | **Obrigatório** | Nome do Realm no Keycloak. |
| `clientId` | `string` | **Obrigatório** | Identificador do Client configurado no Keycloak. |
| `loginMode` | `'redirect' \| 'popup'` | `'redirect'` | Define se o login redireciona a aba atual ou abre em janela pop-up com Overlay. |
| `popupOverlay` | `PopupOverlayOptions` | `{}` | Configurações visuais, componente Vue customizado (`component`) ou handler do modo pop-up. |
| `popupWindowFeatures` | `Record<string, unknown>` | Centralizado `520x640` | Dimensões e posicionamento da janela pop-up nativa do navegador. |
| `storage` | `'localStorage' \| 'sessionStorage'` | `'localStorage'` | Onde salvar a sessão no navegador. Use `'sessionStorage'` para terminais compartilhados. |
| `monitorSession` | `boolean` | `true` | Monitora continuamente a sessão SSO via iframe do `oidc-client-ts`. |
| `automaticSilentRenew` | `boolean` | `true` | Renova automaticamente o token em background antes de expirar. |
| `scope` | `string` | `'openid profile email'` | Escopos OIDC solicitados durante o login. |
| `redirectUri` | `string` | `window.location.origin + window.location.pathname` | URL completa de retorno após login (se preferir passar pelo nome/path da rota, use `loginRoute` no `KeycloakPlugin`). |
| `popupRedirectUri` | `string` | Igual ao `redirectUri` | URL de retorno usada internamente pela janela pop-up. |
| `postLogoutRedirectUri` | `string` | `window.location.origin + '/'` | URL completa de retorno após deslogar (se preferir passar pelo nome/path da rota, use `logoutRoute` no `KeycloakPlugin`). |
| `oidcSettings` | `Partial<UserManagerSettings>` | `{}` | Opções avançadas repassadas diretamente para o `UserManager` do `oidc-client-ts`. |

---

### `PopupOverlayOptions` e Props do Componente Customizado

Opções aceitas dentro de `popupOverlay`:

| Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `component` | `Component` | `PopupOverlay.vue` | Seu próprio componente Vue (`.vue`) para substituir o card padrão de bloqueio. |
| `title` | `string` | `'Autenticação Necessária'` | Título exibido no card padrão. |
| `message` | `string` | `'Para acessar o sistema...'` | Mensagem inicial antes de abrir o pop-up. |
| `waitingMessage` | `string` | `'Conclua a autenticação...'` | Mensagem exibida enquanto a janela pop-up está aberta. |
| `retryMessage` | `string` | `'A janela de login foi fechada...'` | Mensagem exibida quando o usuário fecha o pop-up sem logar. |
| `buttonText` | `string` | `'Entrar no Sistema'` | Texto do botão de ação. |
| `waitingButtonText` | `string` | `'Aguardando login...'` | Texto do botão enquanto a janela pop-up está aberta. |
| `logoUrl` | `string \| null` | `null` | URL de imagem do logotipo (substitui o ícone de cadeado padrão). |
| `backgroundColor` | `string` | `'rgba(11, 28, 46, 0.92)'` | Cor de fundo da camada que cobre a tela. |
| `cardBackgroundColor` | `string` | `'#ffffff'` | Cor de fundo do card central. |
| `textColor` | `string` | `'#102A43'` | Cor do texto no card padrão. |
| `primaryColor` | `string` | `'#486581'` | Cor principal do botão e ícone no card padrão. |
| `customHandler` | `Function` | `undefined` | Função assíncrona `{ triggerPopup } => Promise` para controle manual. |

Quando você fornece um componente próprio em `popupOverlay: { component: MeuComponente }`, a biblioteca injeta automaticamente nele:
- **Props:**
  - `carregando: boolean` (`true` enquanto o pop-up está aberto aguardando autenticação).
  - `tentarNovamente: boolean` (`true` se o usuário fechou a janela pop-up sem concluir o login).
  - `opcoes: PopupOverlayOptions` (objeto completo com textos e cores mesclados).
  - `acionarLogin: () => Promise<void>` (função para abrir o pop-up).
- **Eventos:**
  - `@acionarLogin`: Evento que seu botão pode emitir (`emit('acionarLogin')`) para abrir a janela pop-up.

---

### `KeycloakPlugin`

Opções aceitas no `app.use(KeycloakPlugin, options)`:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `keycloak` | `KeycloakAdapter` | **Obrigatório** | Instância criada por `createKeycloak()`. |
| `router` | `Router` | **Obrigatório** | Instância do Vue Router. |
| `optionsKeycloak` | `KeycloakInitOptions` | `{}` | Opções de inicialização (`onLoad: 'login-required' \| 'check-sso'`). |
| `loginRoute` | `RouteLocationRaw` | URL atual (`origin + pathname`) | Rota do Vue Router para onde enviar após logar (ex: `{ name: 'admin' }` ou `{ path: '/painel' }`). |
| `forbiddenRoute` | `RouteLocationRaw` | `undefined` | Rota para redirecionar quando faltar permissão (ex: `{ name: 'error-403' }`). |
| `logoutRoute` | `RouteLocationRaw` | `undefined` | Rota para enviar o usuário após deslogar ou perder a sessão (ex: `{ name: 'validar' }`). |
| `rolesMode` | `'any' \| 'all'` | `'any'` | Modo padrão para checagem de `roles` nas rotas. |
| `groupsMode` | `'any' \| 'all'` | `'any'` | Modo padrão para checagem de `groups` nas rotas. |
| `refreshTimeout` | `number` | `90000` | Intervalo em milissegundos para checagem periódica do token (90s). |
| `deactivateTimeout`| `boolean` | `false` | Se `true`, desliga o timer periódico e a revalidação de foco de aba. |
| `customRules` | `(record, to) => ...` | `undefined` | Função assíncrona para regras extras de autorização nas rotas. |
| `onReady` | `() => void` | `undefined` | Executado assim que a autenticação termina de inicializar (ideal para `app.mount`). |
| `onLogin` | `() => void` | `undefined` | Executado após o usuário autenticar com sucesso. |
| `onLogout` | `() => void` | `undefined` | Executado quando a sessão é encerrada (localmente, em outra aba ou via SSO). |
| `onForbidden` | `(to) => void` | `undefined` | Executado toda vez que o usuário é barrado por falta de role ou grupo. |
| `onError` | `(err) => void` | `undefined` | Executado caso ocorra falha de comunicação na inicialização. |
| `debug` | `boolean` | `false` | Exibe logs detalhados de autenticação, grupos e roles no console do navegador. |

---

### `usePermissions<TRole>()`

Retorna métodos reativos para checar permissões (se `is_superuser` for `true` na store, todos retornam `true`):

- `hasRole(role)`: Verifica um papel único.
- `hasAnyRole([role1, role2])`: Verifica se possui **ao menos um** dos papéis (`readonly (TRole | string)[]`).
- `hasAllRoles([role1, role2])`: Verifica se possui **todos** os papéis (`readonly (TRole | string)[]`).
- `hasGroup(group)`: Verifica se pertence a um grupo.
- `hasAnyGroup([group1, group2])`: Verifica se pertence a **ao menos um** dos grupos (`readonly string[]`).
- `hasAllGroups([group1, group2])`: Verifica se pertence a **todos** os grupos (`readonly string[]`).

---

### `createAuthGuard(options)`

Caso não queira usar o `KeycloakPlugin` completo e prefira registrar apenas o guardião manualmente no roteador (`router.beforeEach(createAuthGuard(options))`), todas as opções de `forbiddenRoute`, `rolesMode`, `groupsMode`, `customRules` e `onForbidden` estão disponíveis.

---

### `useKeycloakStore()`

Principais propriedades e ações disponíveis na store do Pinia:

- **Dados e Tokens:** `token`, `tokenParsed` (ou `token_decode`), `authHeader`, `isAuthenticated`, `id`, `username`, `first_name`, `name`, `email`, `gravatar`, `roles`, `groups`, `keycloakInstance` (armazenado via `shallowRef` para máxima performance).
- **Ações de Autenticação:**
  - `loginAction(options?: KeycloakLoginOptions)`: Inicia o fluxo de login configurado (ou permite forçar um modo específico, ex: `authStore.loginAction({ loginMode: 'redirect' })`) e sincroniza os dados na store.
  - `loginPopupAction()`: Abre diretamente a janela pop-up de login do Keycloak sem overlay intermediário e sincroniza os dados do usuário na store assim que autenticar.
  - `logoutAction(motivo?: string | null)`: Registra o motivo no histórico local, limpa os dados reativos da store e redireciona para encerrar a sessão no servidor Keycloak (enviando o usuário de volta para a rota definida em `logoutRoute` ou `postLogoutRedirectUri`).
- **Extensão Dinâmica (`extend`):** Precisa guardar informações extras do usuário vindas do seu banco de dados na mesma store? Use `authStore.setExtend('matricula', '20261045')` e acesse em qualquer lugar via `authStore.extend.matricula`. Para limpar uma chave, use `authStore.removeExtend('matricula')`.
- **Auditoria de Quedas de Sessão:** Sempre que uma sessão cai ou é encerrada, a biblioteca salva o motivo, a data e a URL no `localStorage` sob a chave **`historico_deslogamento`** (mantendo os últimos 200 eventos).

---

### Tipagens Automáticas (`RouteMeta` e `GlobalDirectives`)

Ao importar a biblioteca em um projeto TypeScript, o VS Code passa a reconhecer automaticamente as propriedades nas rotas e as diretivas nos componentes Vue:

```typescript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string | string[] | readonly string[];
    rolesMode?: 'any' | 'all';
    groups?: string | string[] | readonly string[];
    groupsMode?: 'any' | 'all';
    [key: string]: unknown;
  }
}

declare module 'vue' {
  export interface GlobalDirectives {
    vCan: CanDirective; // Suporta :role, :group e modificadores .all, .not, .disable
    vHas: CanDirective;
  }
}
```

---

## 5. Resolução de Problemas Comuns (FAQ)

### 1. Erro no Vite ao atualizar o pacote (`doesn't provide an export named...`)
O Vite faz cache de pacotes pré-compilados em `node_modules/.vite`. Sempre que atualizar a versão do `v-keycloak-store`, suba o servidor de desenvolvimento limpando o cache:
```bash
npm run dev -- --force
```

### 2. Conflito de `tsconfigRootDir` no ESLint
Se o seu projeto exibir `Parsing error: No tsconfigRootDir was set`, adicione no seu arquivo `eslint.config.ts`:
```typescript
languageOptions: {
  parserOptions: {
    tsconfigRootDir: import.meta.dirname,
  },
}
```

### 3. O usuário deslogou mas outra aba demorou para perceber
Verifique se você configurou `storage: 'sessionStorage'`. O `sessionStorage` é isolado por aba pelo próprio navegador, portanto eventos instantâneos de `storage` entre abas só ocorrem no modo padrão (`localStorage`). No `sessionStorage`, a outra aba detectará o encerramento da sessão através do monitoramento OIDC (`monitorSession`) ou ao ganhar foco novamente.