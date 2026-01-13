import { useKeycloakStore } from "./store.js";

function checkPermissions(el, binding) {
    const keycloakStore = useKeycloakStore();
    if (!keycloakStore.keycloakInstance) {
        // Keycloak não inicializado. Ocultando elemento por segurança.
        el.style.display = 'none';
        return;
    }

    const type = binding.arg; //  'role' ou 'group' da diretiva usada
    const value = binding.value; // O valor passado, ex: 'admin'

    let hasPermission = false;

    // Lógica baseada no argumento e valor fornecidos à diretiva
    switch (type) {
        case 'role':
            // Remove barras e normaliza nomes dos papéis
            const userRoles = keycloakStore.roles.map((r) =>
            r
                .replace(/^\/+|\/+$/g, "")
                .split("/")
                .pop()
                .toUpperCase()
            );
            hasPermission = userRoles.includes(value.toUpperCase());
            break;

        case 'group':
            // Remove barras e normaliza nomes dos grupos
            const userGroups = keycloakStore.groups.map((g) =>
            g
                .replace(/^\/+|\/+$/g, "")
                .split("/")
                .pop()
                .toUpperCase()
            );
            hasPermission = userGroups.includes(value.toUpperCase());
            break;

        default:
            console.warn(`Argumento inválido para v-can: ${type}. Use :role ou :group`);
            hasPermission = false;
    }

    // Ação no DOM
    if (!hasPermission) {
        // Verifica se o elemento tem um pai para poder se remover
        if (el.parentNode) {
            const comment = document.createComment(` v-can removido: ${type}' `);
            el.parentNode.replaceChild(comment, el);
        } else {
            // Fallback caso o elemento ainda não tenha sido inserido no DOM (raro no mounted)
            el.style.display = 'none';
        }
    } else {
        // Se tiver permissão, não faz nada. O elemento renderiza normalmente.
    }
}

export default {
    mounted(el, binding) {
        checkPermissions(el, binding);
    },
    updated(el, binding) {
        // Cuidado: Se o elemento foi removido no mounted, este updated não será chamado.
        checkPermissions(el, binding);
    },
};