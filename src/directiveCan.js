import { useKeycloakStore } from './store.js';
import { checkAnyRole, checkAnyGroup } from './authorization.js';

/**
 * Verifica se o usuário possui as permissões necessárias (papéis ou grupos).
 * Suporta string única ou array de strings.
 *
 * Exemplo de uso:
 * <div v-can:role="'admin'">Apenas admins</div>
 * <div v-can:group="'managers'">Apenas managers</div>
 * <div v-can:role="['admin', 'editor']">Admins ou editors</div>
 * <div v-can:group="['managers', 'staff']">Managers ou staff</div>
 */
function verificarPermissoes(el, binding) {
  const store = useKeycloakStore();

  if (!store.keycloakInstance) {
    el.style.display = 'none';
    return;
  }

  const tipo = binding.arg;
  const valor = binding.value;
  const lista = Array.isArray(valor) ? valor : [valor];

  let temAcesso = false;

  if (tipo === 'role') {
    temAcesso = checkAnyRole(store.roles, lista);
  } else if (tipo === 'group') {
    temAcesso = checkAnyGroup(store.groups, lista);
  } else {
    console.warn(`Argumento inválido para diretiva: ${tipo}. Use :role ou :group.`);
    return;
  }

  if (!temAcesso) {
    if (el.parentNode) {
      const comentario = document.createComment(`v-can removido: ${tipo}`);
      el.parentNode.replaceChild(comentario, el);
      return;
    }
    el.style.display = 'none';
  }
}

export default {
  mounted(el, binding) {
    verificarPermissoes(el, binding);
  },
  updated(el, binding) {
    verificarPermissoes(el, binding);
  }
};