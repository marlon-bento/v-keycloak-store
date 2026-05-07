import { useKeycloakStore } from "./store.js";

/**
 * Verifica se o usuário possui as permissões necessárias (papeis ou grupos).
 * Suporta string única ou array de strings.
 * Exemplo de uso:
 * <div v-can:role="'admin'">Apenas admins veem isso</div>
 * <div v-can:group="'managers'">Apenas managers veem isso</div>
 * <div v-can:role="['admin', 'editor']">Admins ou editors veem isso</div>
 * <div v-can:group="['managers', 'staff']">Managers ou staff veem isso</div>
 */
function verificarPermissoes(el, binding) {
    const keycloakStore = useKeycloakStore();
    
    if (!keycloakStore.keycloakInstance) {
        el.style.display = 'none';
        return;
    }

    const tipo = binding.arg; // 'role' ou 'group'
    const valorSujetado = binding.value;

    // Converte o valor para array caso seja uma string e normaliza para maiúsculas
    const listaRequerida = Array.isArray(valorSujetado) 
        ? valorSujetado.map(v => v.toUpperCase()) 
        : [valorSujetado.toUpperCase()];

    let temAcesso = false;

    // Função interna para limpar e formatar strings do Keycloak
    const normalizarCaminho = (caminho) => 
        caminho.replace(/^\/+|\/+$/g, "").split("/").pop().toUpperCase();

    if (tipo === 'role') {
        const papeisUsuario = keycloakStore.roles.map(normalizarCaminho);
        // Verifica se ao menos um papel requerido está presente nos papéis do usuário
        temAcesso = listaRequerida.some(papel => papeisUsuario.includes(papel));
    } else if (tipo === 'group') {
        const gruposUsuario = keycloakStore.groups.map(normalizarCaminho);
        // Verifica se ao menos um grupo requerido está presente nos grupos do usuário
        temAcesso = listaRequerida.some(grupo => gruposUsuario.includes(grupo));
    } else {
        console.warn(`Argumento inválido: ${tipo}. Use :role ou :group
            exemplo: v-can:role="'admin'" ou v-can:group="'managers'", também suporta multiplos: v-can:role="['admin', 'editor']" ou v-can:group="['managers', 'staff']"
            `);
    }

    // Gerenciamento do elemento no DOM
    if (!temAcesso) {
        if (el.parentNode) {
            const comentario = document.createComment(` v-can removido: ${tipo} `);
            el.parentNode.replaceChild(comentario, el);
        } else {
            el.style.display = 'none';
        }
    }
}

export default {
    mounted(el, binding) {
        verificarPermissoes(el, binding);
    },
    updated(el, binding) {
        verificarPermissoes(el, binding);
    },
};