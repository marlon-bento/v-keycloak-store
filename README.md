v-keycloak-storePlugin de autenticação e autorização para Vue 3 utilizando Keycloak, Vue Router e Pinia. Ele fornece gerenciamento de estado global para o usuário autenticado, renovação automática de token em background, proteção de rotas nativa e diretivas customizadas para controle de acesso no DOM.  InstalaçãoComo a biblioteca depende do ecossistema moderno do Vue, certifique-se de instalar as dependências necessárias junto com ela:

```
npm install v-keycloak-store keycloak-js pinia
```
Configuração InicialPara iniciar o poder da autenticação, você precisa registrar o plugin na sua aplicação Vue, fornecendo a instância do Keycloak e o Vue Router.  main.js ou main.ts


```js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

// Importando a fábrica e o plugin da biblioteca
import { createKeycloak, KeycloakPlugin } from 'v-keycloak-store'; 

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 1. Criar a instância de conexão com o servidor Keycloak
const keycloakInstance = createKeycloak({
    url: 'URL_DO_SEU_KEYCLOAK',
    realm: 'SEU_REALM',
    clientId: 'SEU_CLIENT_ID'
}); 
const keycloakOptions = {
    keycloak: keycloakInstance, 
    router: router, 
    optionsKeycloak: {
        onLoad: "login-required",
        checkLoginIframe: true
    },
    refreshTimeout: 90000, // Tempo em ms para checagem de renovação automática do token
    onReady: () => {
        console.log("Keycloak inicializado com sucesso!"),
        app.mount('#app');
    } 
    onLogin: () => console.log("Usuário acabou de logar!"), 
    onLogout: () => console.log("Sessão encerrada!") 
}
// 2. Registrar o Plugin de Autenticação
app.use(KeycloakPlugin, keycloakOptions);



```


Proteção de Rotas (Vue Router)

O plugin intercepta automaticamente a navegação. Para proteger uma rota específica e exigir que o usuário seja redirecionado para a tela de login do Keycloak, basta adicionar requiresAuth: true nos meta dados da rota

```js
const routes = [
    {
        path: '/dashboard',
        component: Dashboard,
        meta: { requiresAuth: true } // Bloqueia a rota e aciona o login se não houver token
    },
    {
        path: '/publico',
        component: Publico
        // Sem o meta requiresAuth, a rota é livre
    }
];
```
Diretiva Customizada v-canA biblioteca fornece a diretiva v-can para renderizar ou remover elementos do DOM de forma reativa, baseando-se nos papéis (roles) ou grupos (groups) do usuário autenticado.  Verificando Papéis (Roles):

```html
<!-- Exige um papel específico -->
<button v-can:role="'admin'">Deletar Usuário (Apenas Admin)</button> 

<!-- Exige ao menos um dos papéis da lista (Array) -->
<div v-can:role="['admin', 'editor']">Área de Edição</div> 
```

Verificando Grupos (Groups):
```html
<!-- Exige um grupo específico -->
<div v-can:group="'managers'">Relatório Financeiro</div> 

<!-- Exige ao menos um dos grupos da lista (Array) -->
<div v-can:group="['managers', 'staff']">Avisos Internos</div> 
```

Gerenciamento de Estado (Pinia)

Você pode acessar os dados decodificados do usuário, recuperar o token e fazer verificações de permissão diretamente no JavaScript/TypeScript de qualquer componente utilizando o useKeycloakStore.

```vue
<script setup>
import { useKeycloakStore } from 'v-keycloak-store';

const authStore = useKeycloakStore(); 

// Exibindo informações do usuário autenticado
console.log(authStore.name); // Nome completo
console.log(authStore.email); // Email
console.log(authStore.gravatar); // URL do avatar (se o usuário usar gravatar) gerado automaticamente via hash do email

// Lógica de token e autenticação
console.log(authStore.token); // Token JWT atual
console.log(authStore.isAuthenticated); // Retorna true ou false

// Verificação manual de acesso no código
if (authStore.is_memberof('admin_group')) { 
    console.log("Usuário faz parte do grupo de administradores.");
}

// Lógica de logout
const efetuarLogout = () => {
    authStore.logoutAction(); // Encerra a sessão no Keycloak e limpa o store 
}
</script>

<template>
  <div v-if="authStore.isAuthenticated">
    <img :src="authStore.gravatar" alt="Avatar do usuário">
    <p>Bem-vindo, {{ authStore.name }}</p>
    <button @click="efetuarLogout">Sair do Sistema</button>
  </div>
</template>
```