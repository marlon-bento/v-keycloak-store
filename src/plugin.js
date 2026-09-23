// ========
// Este arquivo configura e instala o plugin do Keycloak na aplicação Vue.
// Ele inicializa a instância, gerencia o ciclo de vida do token,
// protege as rotas verificando autenticação e monitora eventos
// internos da biblioteca (como o Iframe de SSO) para registrar falhas.
// ========

// src/plugin.js
import { useKeycloakStore } from "./store.js";
import directiveCan from "./directiveCan.js";
export const KeycloakPlugin = {
    // Inicializa o plugin dentro da instância do Vue.
    // Recebe a instância do aplicativo Vue e um objeto de opções contendo as configurações.
    // Devolve nada.
    // É usada para acoplar a lógica de autenticação ao ciclo de vida e rotas do frontend.
    install: (app, options) => {
        // pode usar como v-can ou v-has, ambos funcionam da mesma forma
        app.directive('can', directiveCan);
        app.directive('has', directiveCan);

        if (!options || !options.keycloak) {
            throw new Error('A instância do Keycloak deve ser fornecida!');
        } else if (!options.router) {
            throw new Error('O roteador (router) deve ser fornecido!');
        }

        // 1. PRIMEIRO: Inicializamos as dependências e o Store
        const { keycloak, router, onReady, onError, onLogout, onLogin, optionsKeycloak, refreshTimeout, deactivateTimeout, debug } = options;
        // Obtem store de dentro da biblioteca
        const keycloakStore = useKeycloakStore();
        // Ativa o modo de depuração na store caso a opção debug seja verdadeira.
        if (debug) {
            keycloakStore.setModoDebug(true);
            console.info("Modo debug ativado. Logs internos do Keycloak serão exibidos no console.");
        }
        // INJETA a instância do Keycloak no store para que ele possa usá-la
        keycloakStore.setKeycloakInstance(keycloak);
        // Tenta renovar o token de acesso no servidor assincronamente.
        // Recebe nada.
        // Devolve nada.
        // É usada para manter o usuário autenticado de forma transparente e registrar logs.
        const refreshAndSync = async () => {
            try {
                // Tenta renovar se expirar em menos de 70 segundos
                const refreshed = await keycloak.updateToken(70);

                if (refreshed) {
                    if (debug) {
                        console.info("Token renovado automaticamente.");
                    }
                    // Sincroniza a store com o novo token
                    keycloakStore.getDataKeycloak();
                }
            } catch (error) {
                if (!keycloak.authenticated) {
                    keycloakStore.logoutAction("Sessão perdida no refreshAndSync. O token expirou e o servidor recusou a renovação.");
                } else {
                    keycloakStore.registrarLogDeslogamento("Erro de rede no refreshAndSync, mas a propriedade authenticated continua true. Evitando logout.", false);
                }
            }
        };

        // Configura o temporizador cíclico de validação de token.
        // Recebe nada.
        // Devolve nada.
        // É usada para disparar a verificação de token periodicamente em segundo plano.
        const startTokenRefresh = () => {
            setInterval(() => {
                refreshAndSync();
            },
                refreshTimeout || 90000);
        };



        const initPromise = keycloak.init({
            ...optionsKeycloak
        }).then(() => {
            keycloakStore.getDataKeycloak();
            if (onReady && typeof onReady === 'function') {
                // Chama o callback onReady passando o token e os grupos
                onReady(); // Passa o token para o callback onReady
            }
            // Captura o evento nativo de deslogamento da biblioteca.
            // Recebe nada.
            // Devolve nada.
            // É usada para identificar se o Iframe silencioso detectou perda de sessão ou bloqueio de cookies.
            keycloak.onAuthLogout = () => {
                keycloakStore.registrarLogDeslogamento("Evento nativo onAuthLogout disparado. O Iframe de verificação de SSO falhou ou a sessão encerrou em outra aba.");
                if (onLogout && typeof onLogout === "function") {
                    onLogout();
                }
            };

            // Captura falhas internas de comunicação do Keycloak.
            // Recebe o objeto de erro gerado pela biblioteca.
            // Devolve nada.
            // É usada para rastrear erros não tratados do adaptador JavaScript.
            keycloak.onAuthError = (errorData) => {
                const erroMsg = errorData ? JSON.stringify(errorData) : "Erro desconhecido";
                keycloakStore.registrarLogDeslogamento(`Evento nativo onAuthError disparado pelo keycloak-js: ${erroMsg}`);
            };
            // Captura erros nativos durante a renovação do token.
            // Recebe nada.
            // Devolve nada.
            // É usada para identificar se a biblioteca falhou ao renovar antes de disparar nossa lógica customizada.
            keycloak.onAuthRefreshError = () => {
                keycloakStore.registrarLogDeslogamento("Evento nativo onAuthRefreshError disparado. A renovação em background falhou criticamente na biblioteca.");
            };
            // Captura a expiração definitiva do token.
            // Recebe nada.
            // Devolve nada.
            // É usada para tentar uma renovação imediata e salvar o histórico.
            keycloak.onTokenExpired = () => {
                keycloakStore.registrarLogDeslogamento("Evento nativo onTokenExpired acionado pelo keycloak-js.", false);
                refreshAndSync();
            };


            if (deactivateTimeout !== true) {
                startTokenRefresh();
            }

        }).catch((error) => {
            keycloakStore.registrarLogDeslogamento("Falha catastrófica no keycloak.init. O servidor não respondeu adequadamente.");
            if (onError && typeof onError === 'function') {
                onError(error);
            } else {
                throw new Error("Não foi possível inicializar o sistema de autenticação.");
            }
        });



        // Valida o acesso do usuário para a rota solicitada.
        // Recebe o objeto de destino da rota (to).
        // Devolve um booleano indicando se a navegação deve prosseguir (true) ou ser bloqueada (false).
        // É usada para centralizar a lógica de autenticação desacoplada da assinatura do roteador.
        const verificarAcessoRota = async (to) => {
            if (to.meta.requiresAuth) {
                await initPromise;
                
                if (!keycloakStore.token || !keycloak.authenticated) {

                    if (debug) {
                        console.info(`Acesso negado na rota ${to.path}. Token vazio ou authenticated false.`);
                    }
                    keycloakStore.registrarLogDeslogamento(`Bloqueado pelo router na rota ${to.path}. Token vazio ou authenticated false.`);
                    try {
                        if (debug) {
                            console.info(`Redirecionando para a pagina de login do Keycloak. Rota solicitada: ${to.path}`);
                            console.info(`Token atual do Keycloak Store: ${keycloakStore.token}`);
                        }
                        await keycloak.login({
                            redirectUri: window.location.origin + to.path,
                        });
                        keycloakStore.getDataKeycloak();
                        if (onLogin && typeof onLogin === 'function') {
                            onLogin();
                        }
                        return false;
                    } catch (error) {
                        keycloakStore.registrarLogDeslogamento(`Erro ao tentar redirecionar para a pagina de login: ${error}`);
                        keycloakStore.removeDataKeycloak();
                        return false;
                    }
                }
                return true;
            }
            return true;
        };

        // Variável booleana que detecta se a versão do Vue Router é 4 ou superior.
        // É usada para acoplar dinamicamente o método do guardião de rotas sem causar avisos no console.
        const isVueRouter4 = typeof router.hasRoute === 'function';

        if (isVueRouter4) {
            if (debug) {
                console.info("Vue Router 4 detectado. Usando guardião de rotas com retorno de Promise.");
            }
            router.beforeEach(async (to) => {
                return await verificarAcessoRota(to);
            });
        } else {
            if (debug) {
                console.info("Vue Router 3 detectado. Usando guardião de rotas com callback next().");
            }
            router.beforeEach(async (to, from, next) => {
                const permitido = await verificarAcessoRota(to);
                if (permitido) {
                    next();
                } else {
                    next(false);
                }
            });
        }
    },

};