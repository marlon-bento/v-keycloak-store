// ========
// Controlador isolado para exibicao e gerenciamento do modal de login via Popup.
// Monta o componente padrao PopupOverlay ou um componente Vue customizado fornecido
// pelo usuario, monitorando o foco da janela para destravar em caso de fechamento.
// ========

import { createApp, h, ref } from 'vue';
import type { UserManager, User } from 'oidc-client-ts';
import type { PopupOverlayOptions } from './types';
import PopupOverlay from './components/PopupOverlay.vue';

// Exibe o Overlay de autenticacao via Popup e resolve a Promise quando o usuario logar
export function exibirOverlayPopup(
  userManager: UserManager,
  opcoesBase: PopupOverlayOptions,
  opcoesCustomizadas: PopupOverlayOptions | undefined,
  aoSincronizarUsuario: (user: User) => void
): Promise<unknown> {
  const cfg = {
    title: 'Autenticação Necessária',
    message: 'Para acessar o sistema, realize o login na janela segura de autenticação.',
    waitingMessage: 'Conclua a autenticação na janela que se abriu...',
    retryMessage: 'A janela de login foi fechada. Clique abaixo para abrir novamente:',
    buttonText: 'Entrar no Sistema',
    waitingButtonText: 'Aguardando login...',
    logoUrl: null,
    backgroundColor: 'rgba(11, 28, 46, 0.92)',
    cardBackgroundColor: '#ffffff',
    textColor: '#102A43',
    primaryColor: '#486581',
    ...opcoesBase,
    ...opcoesCustomizadas
  };

  if (cfg.customHandler) {
    return cfg.customHandler({
      triggerPopup: async () => {
        const user = await userManager.signinPopup();
        aoSincronizarUsuario(user);
        return user;
      }
    });
  }

  return new Promise<boolean>((resolve) => {
    const containerExistente = document.getElementById('vkc-popup-gate-root');
    if (containerExistente) {
      containerExistente.remove();
    }

    const container = document.createElement('div');
    container.id = 'vkc-popup-gate-root';
    document.body.appendChild(container);

    const carregando = ref(false);
    const tentarNovamente = ref(false);

    let resolvido = false;
    let popupEmAndamento = false;
    let timerFoco: ReturnType<typeof setTimeout> | null = null;

    const resetarParaNovaTentativa = () => {
      if (resolvido) return;
      popupEmAndamento = false;
      carregando.value = false;
      tentarNovamente.value = true;
    };

    const finalizarComSucesso = (user: User) => {
      if (resolvido) return;
      resolvido = true;
      popupEmAndamento = false;
      if (timerFoco) clearTimeout(timerFoco);
      window.removeEventListener('focus', aoFocarJanela);
      userManager.events.removeUserLoaded(aoCarregarUsuarioDoPopup);
      aoSincronizarUsuario(user);
      instanciaVue.unmount();
      container.remove();
      resolve(true);
    };

    const aoCarregarUsuarioDoPopup = (user: User) => {
      if (user && !user.expired) {
        finalizarComSucesso(user);
      }
    };

    userManager.events.addUserLoaded(aoCarregarUsuarioDoPopup);

    const aoFocarJanela = () => {
      if (!popupEmAndamento || resolvido) return;
      if (timerFoco) clearTimeout(timerFoco);
      timerFoco = setTimeout(async () => {
        if (resolvido) return;
        const usuarioAtual = await userManager.getUser();
        if (usuarioAtual && !usuarioAtual.expired) {
          finalizarComSucesso(usuarioAtual);
        } else {
          resetarParaNovaTentativa();
        }
      }, 600);
    };

    window.addEventListener('focus', aoFocarJanela);

    const acionarPopup = async () => {
      if (timerFoco) clearTimeout(timerFoco);
      popupEmAndamento = true;
      carregando.value = true;

      try {
        const user = await userManager.signinPopup();
        finalizarComSucesso(user);
      } catch (err) {
        console.warn('[v-keycloak-store] Popup fechado ou cancelado:', err);
        resetarParaNovaTentativa();
      }
    };

    const ComponenteAlvo = cfg.component || PopupOverlay;

    const instanciaVue = createApp({
      render() {
        return h(ComponenteAlvo, {
          opcoes: cfg,
          carregando: carregando.value,
          tentarNovamente: tentarNovamente.value,
          acionarLogin: acionarPopup,
          onAcionarLogin: acionarPopup
        });
      }
    });

    instanciaVue.mount(container);
  });
}