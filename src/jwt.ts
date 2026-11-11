// ========
// Funcoes utilitarias para decodificacao de tokens JWT e limpeza de parametros
// temporarios do fluxo OAuth2/OIDC na barra de enderecos do navegador.
// ========

import type { JwtPayload } from './types';

// Decodifica o payload Base64Url de um token JWT em objeto JSON tipado
export function parseJwt(jwt?: string | null): JwtPayload | null {
  if (!jwt) return null;
  try {
    const base64Url = jwt.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

// Remove parametros temporarios de callback OAuth2 da URL atual sem recarregar a pagina
export function limparParametrosOAuthUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const oauthParams = ['code', 'state', 'session_state', 'iss', 'error', 'error_description'];
  let modificado = false;

  for (const param of oauthParams) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      modificado = true;
    }
  }

  if (
    url.hash.includes('state=') ||
    url.hash.includes('code=') ||
    url.hash.includes('error=') ||
    url.hash.includes('session_state=')
  ) {
    url.hash = '';
    modificado = true;
  }

  if (modificado) {
    const urlLimpa = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
    window.history.replaceState({}, document.title, urlLimpa);
  }
}