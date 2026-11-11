<!-- ========
Componente visual do Overlay de autenticacao em modo Popup.
Substitui strings HTML no JavaScript por template Vue declarativo e estilos
encapsulados no proprio componente, dispensando importacao de CSS externo.
======== -->
<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { PopupOverlayOptions } from '../types';

const props = defineProps<{
  opcoes: Required<Omit<PopupOverlayOptions, 'customHandler'>>;
  carregando: boolean;
  tentarNovamente: boolean;
}>();

const emit = defineEmits<{
  (e: 'acionarLogin'): void;
}>();

// Define a mensagem exibida conforme o estagio atual da janela popup
const mensagemExibida = computed(() => {
  if (props.carregando) return props.opcoes.waitingMessage;
  if (props.tentarNovamente) return props.opcoes.retryMessage;
  return props.opcoes.message;
});

// Define o rotulo do botao principal conforme o estado de carregamento
const textoBotao = computed(() => {
  return props.carregando ? props.opcoes.waitingButtonText : props.opcoes.buttonText;
});

const estiloOverlay = computed<CSSProperties>(() => ({
  position: 'fixed',
  inset: '0',
  zIndex: 999999,
  backgroundColor: props.opcoes.backgroundColor,
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif'
}));

const estiloCard = computed<CSSProperties>(() => ({
  backgroundColor: props.opcoes.cardBackgroundColor,
  color: props.opcoes.textColor,
  padding: '2.25rem',
  borderRadius: '12px',
  maxWidth: '400px',
  width: '90%',
  textAlign: 'center',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
}));

const estiloLogo: CSSProperties = {
  maxHeight: '56px',
  maxWidth: '200px',
  margin: '0 auto 1.25rem',
  display: 'block',
  objectFit: 'contain'
};

const estiloIcone = computed<CSSProperties>(() => ({
  width: '52px',
  height: '52px',
  borderRadius: '50%',
  background: '#dce4ec',
  color: props.opcoes.primaryColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 1rem'
}));

const estiloTitulo: CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '1.25rem',
  fontWeight: 700
};

const estiloMensagem: CSSProperties = {
  margin: '0 0 1.5rem',
  opacity: 0.85,
  fontSize: '0.95rem',
  lineHeight: 1.4
};

const estiloBotao = computed<CSSProperties>(() => ({
  backgroundColor: props.opcoes.primaryColor,
  color: '#ffffff',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: props.carregando ? 'not-allowed' : 'pointer',
  opacity: props.carregando ? 0.7 : 1,
  width: '100%',
  transition: 'opacity 0.2s'
}));
</script>

<template>
  <div id="vkc-popup-gate" :style="estiloOverlay">
    <div :style="estiloCard">
      <img
        v-if="opcoes.logoUrl"
        :src="opcoes.logoUrl"
        alt="Logo"
        :style="estiloLogo"
      />
      <div v-else :style="estiloIcone">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h3 :style="estiloTitulo">{{ opcoes.title }}</h3>
      <p id="vkc-gate-msg" :style="estiloMensagem">{{ mensagemExibida }}</p>

      <button
        id="vkc-gate-btn"
        type="button"
        :disabled="carregando"
        :style="estiloBotao"
        @click="emit('acionarLogin')"
      >
        {{ textoBotao }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.vkc-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, sans-serif;
}

.vkc-card {
  padding: 2.25rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.vkc-logo {
  max-height: 56px;
  max-width: 200px;
  margin: 0 auto 1.25rem;
  display: block;
  object-fit: contain;
}

.vkc-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #dce4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.vkc-title {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.vkc-message {
  margin: 0 0 1.5rem;
  opacity: 0.85;
  font-size: 0.95rem;
  line-height: 1.4;
}

.vkc-button {
  color: #ffffff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.vkc-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>