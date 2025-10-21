// src/plugin.js
import { useKeycloakStore } from "./store.js";

export const KeycloakPlugin = {
    install: (app, options) => {

        if (!options || !options.keycloak) {
            throw new Error('A instância do Keycloak deve ser fornecida!');
        } else if (!options.router) {
            throw new Error('O roteador (router) deve ser fornecido!');
        }

        const { keycloak, router, onReady, onError, onLogout, onLogin, optionsKeycloak, refreshTimeout, deactivateTimeout } = options;
        const startTokenRefresh = () => {
            setInterval(() => {
                keycloak
                    .updateToken(60)
                    .then((refreshed) => {
                        if (refreshed) {
                            console.info("Token refreshed");
                        }
                        const keycloakStore = useKeycloakStore();
                        keycloakStore.getDataKeycloak();
                    })
                    .catch(() => {
                        console.error("Failed to refresh token");
                    });
            }, 
            refreshTimeout || 150000);
        };
        // Obtem store de dentro da biblioteca
        const keycloakStore = useKeycloakStore();
        // INJETA a instância do Keycloak no store para que ele possa usá-la
        keycloakStore.setKeycloakInstance(keycloak);

        keycloak.init({
            ...optionsKeycloak
        }).then(() => {
            keycloakStore.getDataKeycloak();
            if (onReady && typeof onReady === 'function') {
                // Chama o callback onReady passando o token e os grupos
                onReady(); // Passa o token para o callback onReady
            }

            keycloak.onAuthLogout = () => {
                if (onLogout && typeof onLogout === "function") {
                    onLogout();
                }
            };
            if (deactivateTimeout !== true){
                startTokenRefresh();
            }
        }).catch((error) => {
            if (onError && typeof onError === 'function') {
                onError(error);
            } else {
                throw new Error("Não foi possível inicializar o sistema de autenticação.");
            }
        });

        router.beforeEach(async (to, from, next) => {
            if (to.meta.requiresAuth) {
                keycloakStore.getDataKeycloak();
                if (!keycloakStore.token) {
                    try {
                        await keycloak.login({
                            redirectUri: window.location.origin + to.fullPath,
                        });
                        if (onLogin && typeof onLogin === 'function') {
                            onLogin();
                        }
                    } catch (error) {
                        keycloakStore.removeDataKeycloak();
                        console.error("Erro ao redirecionar para o login do Keycloak:", error);
                    }
                } else {
                    next();
                }
            } else {
                next();
            }
        });
    },
};