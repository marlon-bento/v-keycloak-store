// ========
// Diretiva Vue (v-can / v-has) para controle declarativo de exibicao ou bloqueio no DOM.
// Avalia papeis (:role) e grupos (:group) suportando os modificadores:
// - .all: exige todos os itens da lista (padrao exige ao menos um).
// - .not: inverte o resultado da verificacao.
// - .disable: desabilita o elemento visualmente e funcionalmente em vez de remove-lo do DOM.
// ========

import type { DirectiveBinding } from 'vue';
import { useKeycloakStore } from './store';
import type { CanDirective, CanDirectiveValue, CanDirectiveModifiers } from './types';
import {
  checkAnyRole,
  checkAllRoles,
  checkAnyGroup,
  checkAllGroups
} from './authorization';

interface ElementoComEstado extends HTMLElement {
  disabled?: boolean;
  _vkcComment?: Comment | null;
  _vkcOriginalState?: {
    disabled?: boolean;
    opacity: string;
    cursor: string;
    pointerEvents: string;
    title: string | null;
  } | null;
}

type CanBinding = DirectiveBinding<CanDirectiveValue, CanDirectiveModifiers, 'role' | 'group'>;

// Calcula se o usuario atende aos criterios de papel ou grupo definidos no binding da diretiva
function calcularAcesso(store: ReturnType<typeof useKeycloakStore>, binding: CanBinding): boolean {
  if (!store.keycloakInstance || !store.isAuthenticated) {
    return false;
  }

  const tipo = binding.arg;
  const valor = binding.value;
  const exigirTodos = Boolean(binding.modifiers?.all);
  const inverterRegra = Boolean(binding.modifiers?.not);
  const lista = Array.isArray(valor) ? valor : [valor as string];

  let resultadoBase = false;

  if (store.is_superuser) {
    resultadoBase = true;
  } else if (tipo === 'role') {
    resultadoBase = exigirTodos
      ? checkAllRoles(store.roles, lista)
      : checkAnyRole(store.roles, lista);
  } else if (tipo === 'group') {
    resultadoBase = exigirTodos
      ? checkAllGroups(store.groups, lista)
      : checkAnyGroup(store.groups, lista);
  } else {
    console.warn(`[v-keycloak-store] Argumento inválido para diretiva: "${tipo}". Use :role ou :group.`);
    return false;
  }

  return inverterRegra ? !resultadoBase : resultadoBase;
}

// Aplica ou reverte o estado desabilitado no elemento preservando estilos originais
function aplicarModoDisable(el: ElementoComEstado, temAcesso: boolean): void {
  if (!el._vkcOriginalState) {
    el._vkcOriginalState = {
      disabled: el.disabled,
      opacity: el.style.opacity,
      cursor: el.style.cursor,
      pointerEvents: el.style.pointerEvents,
      title: el.getAttribute('title')
    };
  }

  if (!temAcesso) {
    if ('disabled' in el) {
      el.disabled = true;
    } else {
      el.style.pointerEvents = 'none';
    }
    el.setAttribute('aria-disabled', 'true');
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
    if (!el.getAttribute('title')) {
      el.setAttribute('title', 'Você não possui permissão para realizar esta ação.');
    }
    return;
  }

  const original = el._vkcOriginalState;
  if ('disabled' in el) {
    el.disabled = Boolean(original.disabled);
  } else {
    el.style.pointerEvents = original.pointerEvents || '';
  }
  el.removeAttribute('aria-disabled');
  el.style.opacity = original.opacity || '';
  el.style.cursor = original.cursor || '';
  if (original.title) {
    el.setAttribute('title', original.title);
  } else {
    el.removeAttribute('title');
  }
}

// Gerencia a remocao/restauracao fisica no DOM ou o bloqueio via modificador .disable
function verificarPermissoes(el: ElementoComEstado, binding: CanBinding): void {
  const store = useKeycloakStore();
  const temAcesso = calcularAcesso(store, binding);
  const modoDisable = Boolean(binding.modifiers?.disable);

  if (modoDisable) {
    if (el._vkcComment && el._vkcComment.parentNode) {
      el._vkcComment.parentNode.replaceChild(el, el._vkcComment);
      el._vkcComment = null;
    }
    aplicarModoDisable(el, temAcesso);
    return;
  }

  if (!temAcesso) {
    if (!el._vkcComment && el.parentNode) {
      const comentario = document.createComment(`v-can:${binding.arg || 'untyped'}`);
      el._vkcComment = comentario;
      el.parentNode.replaceChild(comentario, el);
    } else if (!el.parentNode) {
      el.style.display = 'none';
    }
    return;
  }

  if (el._vkcComment && el._vkcComment.parentNode) {
    el._vkcComment.parentNode.replaceChild(el, el._vkcComment);
    el._vkcComment = null;
  }

  if (el.style.display === 'none') {
    el.style.display = '';
  }
}

const directiveCan: CanDirective = {
  mounted(el, binding) {
    verificarPermissoes(el as ElementoComEstado, binding);
  },
  updated(el, binding) {
    verificarPermissoes(el as ElementoComEstado, binding);
  },
  unmounted(el) {
    const elemento = el as ElementoComEstado;
    if (elemento._vkcComment && elemento._vkcComment.parentNode) {
      elemento._vkcComment.parentNode.removeChild(elemento._vkcComment);
    }
    elemento._vkcComment = null;
    elemento._vkcOriginalState = null;
  }
};

export default directiveCan;