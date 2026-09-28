# v-keycloak-store

> Plugin completo de autenticação e autorização RBAC para **Vue 3**, integrado nativamente com **Keycloak**, **Vue Router 4** e **Pinia**.

Fornece gerenciamento reativo do ciclo de vida da sessão do usuário, renovação automática de token JWT em background, verificação declarativa de papéis (Roles) e grupos (Groups) no roteador, tratamento inteligente de erro 403 (Forbidden) com auto-recuperação, diretivas de controle de exibição no DOM e tipagem estrita com TypeScript.

---

## Sumário

1. [Instalação e Dependências](#1-instalação-e-dependências)
2. [Guia de Início Rápido (Quickstart)](#2-guia-de-início-rápido-quickstart)
3. [Guia de Uso](#3-guia-de-uso)
   - [3.1. Inicialização do Plugin](#31-inicialização-do-plugin)
   - [3.2. Proteção de Rotas e RBAC (Vue Router)](#32-proteção-de-rotas-e-rbac-vue-router)
   - [3.3. Tratamento de 403 e Auto-Recuperação](#33-tratamento-de-403-e-auto-recuperação)
   - [3.4. Regras Customizadas (Feature Flags, etc.)](#34-regras-customizadas-feature-flags-etc)
   - [3.5. Composable `usePermissions`](#35-composable-usepermissions)
   - [3.6. Diretivas Customizadas `v-can` e `v-has`](#36-diretivas-customizadas-v-can-e-v-has)
   - [3.7. Gerenciamento de Estado Global (`useKeycloakStore`)](#37-gerenciamento-de-estado-global-usekeycloakstore)
4. [Referência Completa de Funções e API](#4-referência-completa-de-funções-e-api)
   - [`createKeycloak(options)`](#createkeycloakoptions)
   - [`KeycloakPlugin`](#keycloakplugin)
   - [`usePermissions<TRole>()`](#usepermissionstrole)
   - [`createAuthGuard(options)`](#createauthguardoptions)
   - [`useKeycloakStore()`](#usekeycloakstore)
   - [Extensão de Tipos `RouteMeta`](#extensão-de-tipos-routemeta)
5. [Resolução de Problemas Comuns](#5-resolução-de-problemas-comuns)

---

## 1. Instalação e Dependências

Certifique-se de ter instalado as dependências fundamentais do ecossistema:

```bash
npm install v-keycloak-store keycloak-js pinia
```

Peer dependencies requeridas:
- `vue`: `>= 3.4.0`
- `vue-router`: `>= 4.3.0`
- `pinia`: `>= 2.1.0`

---

## 2. Guia de Início Rápido (Quickstart)

### Configuração básica no `main.ts` / `main.js`:

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

// 1. Criar a instância de conexão com o Keycloak
const keycloak = createKeycloak({
  url: 'https://auth.meudominio.com',
  realm: 'meu-realm',
  clientId: 'meu-frontend'
});

// 2. Instalar o plugin de autenticação
app.use(KeycloakPlugin, {
  keycloak,
  router,
  optionsKeycloak: {
    onLoad: 'login-required',
    checkLoginIframe: false
  },
  forbiddenRoute: { name: 'error-403' },
  onReady: () => {
    app.mount('#app');
  }
});
```

---

## 3. Guia de Uso

### 3.1. Inicialização do Plugin

O `KeycloakPlugin` cuida de:
1. Inicializar o cliente `keycloak-js`.
2. Registrar automaticamente o guardião de rotas no Vue Router.
3. Registrar as diretivas globais `v-can` e `v-has`.
4. Manter o ciclo de renovação automática de token ativo em segundo plano.
5. Sincronizar reativamente o estado da sessão com a store do Pinia.

```typescript
app.use(KeycloakPlugin, {
  keycloak,
  router,
  optionsKeycloak: {
    onLoad: 'check-sso', // ou 'login-required'
    checkLoginIframe: false
  },
  refreshTimeout: 90000, // Intervalo em ms para checar necessidade de renovar token (padrão: 90s)
  forbiddenRoute: { name: 'error-403' }, // Destino ao ter acesso negado por falta de roles
  rolesMode: 'any', // Modo padrão: 'any' (ao menos uma) ou 'all' (todas as roles)
  debug: false // Ativa logs detalhados de diagnóstico no console
});
```

---

### 3.2. Proteção de Rotas e RBAC (Vue Router)

As rotas podem ser protegidas declarativamente via `meta`. Todas as rotas aninhadas em `to.matched` são avaliadas hierarquicamente:

```typescript
import { createRouter, createWebHistory } from 'vue-router';

export enum AppRoles {
  ManageEquipamentos = 'INVENTARIO_MANAGE_EQUIPAMENTO',
  ViewEquipamentos = 'INVENTARIO_VIEW_EQUIPAMENTO',
  Admin = 'ADMIN'
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/publico',
      component: PublicView,
      // Sem meta.requiresAuth: livre acesso
    },
    {
      path: '/dashboard',
      component: DashboardView,
      meta: {
        requiresAuth: true // Exige apenas que o usuário esteja autenticado
      }
    },
    {
      path: '/gerenciar',
      component: GerenciarLayout,
      meta: {
        requiresAuth: true,
        roles: [AppRoles.ManageEquipamentos, AppRoles.ViewEquipamentos],
        rolesMode: 'any' // Acesso concedido se possuir QUALQUER um dos papéis
      },
      children: [
        {
          path: 'criar',
          component: CriarView,
          meta: {
            roles: [AppRoles.ManageEquipamentos] // Sobrescreve/adiciona restrição específica para a rota filha
          }
        }
      ]
    },
    {
      path: '/403',
      name: 'error-403',
      component: () => import('@/views/Error403View.vue'),
      meta: { title: 'Acesso Negado' }
    }
  ]
});
```

---

### 3.3. Tratamento de 403 e Auto-Recuperação

Quando um usuário tenta acessar uma rota protegida por papéis que ele não possui:
1. O guardião bloqueia a transição de rota.
2. Redireciona o usuário para `forbiddenRoute` anexando a rota de destino na query string:
   `/403?redirect=/gerenciar/criar`
3. **Auto-Recuperação Automática**: Se o usuário estiver na tela de 403 e seus papéis forem atualizados (ou trocar de perfil), o guardião resolve automaticamente o parâmetro `query.redirect`. Se o usuário agora for elegível, ele é automaticamente redirecionado de volta à página de destino pretendida.

---

### 3.4. Regras Customizadas (Feature Flags, etc.)

Você pode passar regras assíncronas externas (como verificação de Feature Flags ou Tenant) através do gancho `customRules`:

```typescript
import { createAuthGuard } from 'v-keycloak-store';
import { useFeatureFlagsStore } from '@/stores/featureFlags';

export function setupRouterGuards(router: Router) {
  const guard = createAuthGuard({
    router,
    forbiddenRoute: { name: 'error-403' },
    customRules: async (record, to) => {
      if (record.meta?.featureFlag) {
        const flags = useFeatureFlagsStore();
        if (!flags.isLoaded) {
          await flags.carregarFlags();
        }
        return flags.isEnabled(record.meta.featureFlag as string);
      }
      return true; // Libera acesso
    }
  });

  router.beforeEach(guard);
}
```

---

### 3.5. Composable `usePermissions`

Permite inspecionar papéis e grupos de forma totalmente reativa dentro de componentes Vue:

```vue
<script setup lang="ts">
import { usePermissions } from 'v-keycloak-store';
import { AppRoles } from '@/constants/roles';

// Tipagem com enum próprio da aplicação:
const {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasGroup,
  hasAnyGroup,
  hasAllGroups
} = usePermissions<AppRoles>();

function executarExclusao() {
  if (!hasRole(AppRoles.ManageEquipamentos)) {
    alert('Você não tem permissão para excluir!');
    return;
  }
  // Exclusão permitida
}
</script>

<template>
  <div>
    <!-- Renderização condicional por papel único -->
    <button v-if="hasRole(AppRoles.ManageEquipamentos)" @click="executarExclusao">
      Excluir Registro
    </button>

    <!-- Renderização condicional por múltiplos papéis (ao menos um) -->
    <section v-if="hasAnyRole([AppRoles.ManageEquipamentos, AppRoles.ViewEquipamentos])">
      <TabelaEquipamentos />
    </section>

    <!-- Renderização condicional por grupo -->
    <aside v-if="hasGroup('ti')">
      Painel Técnico
    </aside>
  </div>
</template>
```

---

### 3.6. Diretivas Customizadas `v-can` e `v-has`

As diretivas `v-can` e `v-has` (sinônimos) removem o elemento fisicamente do DOM caso o usuário não atenda às condições:

```html
<!-- Verificando Papel Único -->
<button v-can:role="'ADMIN'">Ação Administrativa</button>

<!-- Verificando Lista de Papéis (ao menos um) -->
<div v-can:role="['ADMIN', 'GESTOR']">Painel de Controle</div>

<!-- Verificando Grupo Único -->
<span v-can:group="'ti'">Apenas Membros do TI</span>

<!-- Verificando Lista de Grupos (ao menos um) -->
<nav v-can:group="['ti', 'financeiro']">Links Internos</nav>
```

---

### 3.7. Gerenciamento de Estado Global (`useKeycloakStore`)

Acesso direto às propriedades e ações de autenticação:

```vue
<script setup lang="ts">
import { useKeycloakStore } from 'v-keycloak-store';

const authStore = useKeycloakStore();

console.log(authStore.token);          // Token JWT em string
console.log(authStore.token_decode);   // Payload decodificado do JWT
console.log(authStore.isAuthenticated);// true se houver token válido
console.log(authStore.username);       // preferred_username
console.log(authStore.name);           // Nome completo do usuário
console.log(authStore.email);          // E-mail cadastrado
console.log(authStore.gravatar);       // URL de avatar do Gravatar gerado pelo e-mail
console.log(authStore.roles);          // Array de strings com os papéis do usuário
console.log(authStore.groups);         // Array de strings com os grupos do usuário

function deslogar() {
  authStore.logoutAction('Logout solicitado pelo usuário');
}
</script>
```

---

## 4. Referência Completa de Funções e API

### `createKeycloak(options)`

Fábrica responsável por instanciar o adaptador `Keycloak` oficial.

| Parâmetro | Tipo | Obrigatório | Descrição |
| :--- | :--- | :--- | :--- |
| `options.url` | `string` | Sim | URL base do servidor Keycloak. |
| `options.realm` | `string` | Sim | Nome do realm configurado. |
| `options.clientId` | `string` | Sim | Identificador do cliente OpenID Connect. |

**Retorno:** Instância tipada de `Keycloak`.

---

### `KeycloakPlugin`

Plugin do Vue 3 instalado com `app.use(KeycloakPlugin, options)`.

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `keycloak` | `Keycloak` | **Obrigatório** | Instância retornada por `createKeycloak()`. |
| `router` | `Router` | **Obrigatório** | Instância do roteador Vue Router. |
| `optionsKeycloak` | `KeycloakInitOptions` | `{}` | Opções repassadas ao `keycloak.init()` nativo. |
| `forbiddenRoute` | `RouteLocationRaw` | `undefined` | Rota para redirecionar em caso de 403 (ex: `{ name: 'error-403' }`). |
| `rolesMode` | `'any' \| 'all'` | `'any'` | Modo padrão de validação de papéis em rotas. |
| `groupsMode` | `'any' \| 'all'` | `'any'` | Modo padrão de validação de grupos em rotas. |
| `refreshTimeout` | `number` | `90000` | Frequência em milissegundos para verificação e renovação de token. |
| `deactivateTimeout`| `boolean` | `false` | Se `true`, desativa o temporizador de renovação periódica. |
| `customRules` | `(record, to) => boolean \| Promise<boolean>` | `undefined` | Hook assíncrono para validações personalizadas. |
| `onForbidden` | `(to) => void` | `undefined` | Callback executado ao ocorrer acesso proibido por falta de permissão. |
| `onReady` | `() => void` | `undefined` | Callback disparado após inicialização bem-sucedida do Keycloak. |
| `onLogin` | `() => void` | `undefined` | Callback disparado após login bem-sucedido. |
| `onLogout` | `() => void` | `undefined` | Callback disparado após término de sessão. |
| `onError` | `(err) => void` | `undefined` | Callback disparado em caso de erro na inicialização. |
| `debug` | `boolean` | `false` | Ativa logs detalhados da biblioteca no console. |

---

### `usePermissions<TRole>()`

Composable reativo para checagem de papéis e grupos.

```typescript
function usePermissions<TRole extends string = string>(customStore?: KeycloakStore): UsePermissionsReturn<TRole>
```

#### Métodos retornados:

- **`hasRole(role: TRole | string): boolean`**: Retorna `true` se o usuário possuir o papel indicado. Suporta normalização de caixa alta e caminhos de realm.
- **`hasAnyRole(roles: (TRole | string)[]): boolean`**: Retorna `true` se o usuário possuir ao menos um dos papéis informados. Retorna `true` se a lista for vazia.
- **`hasAllRoles(roles: (TRole | string)[]): boolean`**: Retorna `true` apenas se o usuário possuir todos os papéis informados. Retorna `true` se a lista for vazia.
- **`hasGroup(group: string): boolean`**: Retorna `true` se o usuário pertencer ao grupo indicado.
- **`hasAnyGroup(groups: string[]): boolean`**: Retorna `true` se pertencer a ao menos um dos grupos informados.
- **`hasAllGroups(groups: string[]): boolean`**: Retorna `true` se pertencer a todos os grupos informados.

---

### `createAuthGuard(options)`

Gera uma função de guardião de navegação (`NavigationGuard`) para acoplamento manual com `router.beforeEach(guard)`.

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `router` | `Router` | Opcional | Instância do roteador para resolver redirects de 403. |
| `forbiddenRoute` | `RouteLocationRaw` | Opcional | Rota de destino em caso de falta de permissão. |
| `keycloak` | `Keycloak` | Opcional | Resolução automática a partir da store se omitido. |
| `store` | `KeycloakStore` | Opcional | Resolução automática de `useKeycloakStore()` se omitido. |
| `rolesMode` | `'any' \| 'all'` | `'any'` | Modo de avaliação dos papéis. |
| `groupsMode` | `'any' \| 'all'` | `'any'` | Modo de avaliação dos grupos. |
| `customRules` | `(record, to) => ...` | Opcional | Hook customizado para regras adicionais (Feature Flags). |
| `onForbidden` | `(to) => void` | Opcional | Callback acionado ao negar acesso por papéis/grupos. |

---

### `useKeycloakStore()`

Store Pinia com o estado global da sessão.

#### Estado e Getters:
- `token`: String com o token de acesso JWT atual.
- `token_decode`: Objeto com o payload decodificado do token.
- `isAuthenticated`: Booleano reativo indicando se o usuário possui sessão ativa.
- `id`: `sub` do usuário no Keycloak.
- `username`: Nome de usuário (`preferred_username`).
- `name`: Nome completo.
- `email`: E-mail do usuário.
- `roles`: Lista de papéis (`roles`) extraídos do token.
- `groups`: Lista de grupos (`groups`) extraídos do token.
- `gravatar`: URL do avatar gerado via Gravatar.
- `extend`: Objeto para armazenar propriedades dinâmicas adicionais.

#### Ações principais:
- `getDataKeycloak()`: Recarrega e sincroniza os dados do token com a store.
- `removeDataKeycloak()`: Limpa o estado da store.
- `logoutAction(motivo?: string)`: Executa logout seguro no Keycloak e registra histórico de diagnóstico.
- `hasRole(role: string)`: Avalia papel diretamente pela store.
- `hasAnyRole(roles: string[])`: Avalia papéis no modo any.
- `hasAllRoles(roles: string[])`: Avalia papéis no modo all.
- `hasGroup(group: string)`: Avalia grupo diretamente pela store.
- `hasAnyGroup(groups: string[])`: Avalia grupos no modo any.
- `hasAllGroups(groups: string[])`: Avalia grupos no modo all.
- `setExtend(key: string, value: unknown)`: Adiciona chave ao objeto estendido.
- `removeExtend(key: string)`: Remove chave do objeto estendido.
- `setModoDebug(valor: boolean)`: Habilita ou desabilita logs internos.
- `registrarLogDeslogamento(motivo: string, fatal?: boolean)`: Salva evento no histórico local (`historico_deslogamento`).

---

### Extensão de Tipos `RouteMeta`

A biblioteca amplia automaticamente o módulo `vue-router` com tipos estritos:

```typescript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: string[] | readonly string[];
    rolesMode?: 'any' | 'all';
    groups?: string[] | readonly string[];
    groupsMode?: 'any' | 'all';
    [key: string]: unknown;
  }
}
```

---

## 5. Resolução de Problemas Comuns

### 1. `Uncaught SyntaxError: ... doesn't provide an export named: 'usePermissions'`
O Vite armazena dependências de terceiros pré-empacotadas em cache em `node_modules/.vite`. Ao atualizar a biblioteca localmente, execute o servidor de desenvolvimento com limpeza de cache:
```bash
npm run dev -- --force
```

### 2. Conflito de `tsconfigRootDir` no ESLint
Se o seu projeto emitir `Parsing error: No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present`, configure explicitamente no seu `eslint.config.ts`:
```typescript
languageOptions: {
  parserOptions: {
    tsconfigRootDir: import.meta.dirname,
  },
}
```