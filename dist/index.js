import { WebStorageStateStore as me, UserManager as ve } from "oidc-client-ts";
import { defineComponent as ye, computed as T, openBlock as ie, createElementBlock as se, normalizeStyle as V, createElementVNode as z, toDisplayString as le, ref as b, createApp as we, h as ke, shallowRef as _e, toRaw as ce } from "vue";
import { defineStore as Ae } from "pinia";
import Se from "crypto-js";
function Y(e) {
  if (!e) return null;
  try {
    const t = e.split(".")[1];
    if (!t) return null;
    const r = t.replace(/-/g, "+").replace(/_/g, "/"), l = decodeURIComponent(
      atob(r).split("").map((p) => "%" + ("00" + p.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(l);
  } catch {
    return null;
  }
}
function X() {
  if (typeof window > "u") return;
  const e = new URL(window.location.href), t = ["code", "state", "session_state", "iss", "error", "error_description"];
  let r = !1;
  for (const l of t)
    e.searchParams.has(l) && (e.searchParams.delete(l), r = !0);
  if ((e.hash.includes("state=") || e.hash.includes("code=") || e.hash.includes("error=") || e.hash.includes("session_state=")) && (e.hash = "", r = !0), r) {
    const l = e.pathname + (e.search ? e.search : "") + (e.hash ? e.hash : "");
    window.history.replaceState({}, document.title, l);
  }
}
const Ue = ["src"], be = ["disabled"], Ce = /* @__PURE__ */ ye({
  __name: "PopupOverlay",
  props: {
    opcoes: {},
    carregando: { type: Boolean },
    tentarNovamente: { type: Boolean }
  },
  emits: ["acionarLogin"],
  setup(e, { emit: t }) {
    const r = e, l = t, p = T(() => r.carregando ? r.opcoes.waitingMessage : r.tentarNovamente ? r.opcoes.retryMessage : r.opcoes.message), g = T(() => r.carregando ? r.opcoes.waitingButtonText : r.opcoes.buttonText), m = T(() => ({
      position: "fixed",
      inset: "0",
      zIndex: 999999,
      backgroundColor: r.opcoes.backgroundColor,
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif"
    })), f = T(() => ({
      backgroundColor: r.opcoes.cardBackgroundColor,
      color: r.opcoes.textColor,
      padding: "2.25rem",
      borderRadius: "12px",
      maxWidth: "400px",
      width: "90%",
      textAlign: "center",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
    })), h = {
      maxHeight: "56px",
      maxWidth: "200px",
      margin: "0 auto 1.25rem",
      display: "block",
      objectFit: "contain"
    }, C = T(() => ({
      width: "52px",
      height: "52px",
      borderRadius: "50%",
      background: "#dce4ec",
      color: r.opcoes.primaryColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 1rem"
    })), S = {
      margin: "0 0 0.5rem",
      fontSize: "1.25rem",
      fontWeight: 700
    }, d = {
      margin: "0 0 1.5rem",
      opacity: 0.85,
      fontSize: "0.95rem",
      lineHeight: 1.4
    }, A = T(() => ({
      backgroundColor: r.opcoes.primaryColor,
      color: "#ffffff",
      border: "none",
      padding: "0.75rem 1.5rem",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: 600,
      cursor: r.carregando ? "not-allowed" : "pointer",
      opacity: r.carregando ? 0.7 : 1,
      width: "100%",
      transition: "opacity 0.2s"
    }));
    return (L, a) => (ie(), se("div", {
      id: "vkc-popup-gate",
      style: V(m.value)
    }, [
      z("div", {
        style: V(f.value)
      }, [
        e.opcoes.logoUrl ? (ie(), se("img", {
          key: 0,
          src: e.opcoes.logoUrl,
          alt: "Logo",
          style: h
        }, null, 8, Ue)) : (ie(), se("div", {
          key: 1,
          style: V(C.value)
        }, [...a[1] || (a[1] = [
          z("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: "26",
            height: "26",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
          }, [
            z("rect", {
              x: "3",
              y: "11",
              width: "18",
              height: "11",
              rx: "2",
              ry: "2"
            }),
            z("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
          ], -1)
        ])], 4)),
        z("h3", { style: S }, le(e.opcoes.title), 1),
        z("p", {
          id: "vkc-gate-msg",
          style: d
        }, le(p.value), 1),
        z("button", {
          id: "vkc-gate-btn",
          type: "button",
          disabled: e.carregando,
          style: V(A.value),
          onClick: a[0] || (a[0] = (c) => l("acionarLogin"))
        }, le(g.value), 13, be)
      ], 4)
    ], 4));
  }
}), Le = (e, t) => {
  const r = e.__vccOpts || e;
  for (const [l, p] of t)
    r[l] = p;
  return r;
}, xe = /* @__PURE__ */ Le(Ce, [["__scopeId", "data-v-d3272f49"]]);
function Pe(e, t, r, l) {
  const p = {
    title: "Autenticação Necessária",
    message: "Para acessar o sistema, realize o login na janela segura de autenticação.",
    waitingMessage: "Conclua a autenticação na janela que se abriu...",
    retryMessage: "A janela de login foi fechada. Clique abaixo para abrir novamente:",
    buttonText: "Entrar no Sistema",
    waitingButtonText: "Aguardando login...",
    logoUrl: null,
    backgroundColor: "rgba(11, 28, 46, 0.92)",
    cardBackgroundColor: "#ffffff",
    textColor: "#102A43",
    primaryColor: "#486581",
    ...t,
    ...r
  };
  return p.customHandler ? p.customHandler({
    triggerPopup: async () => {
      const g = await e.signinPopup();
      return l(g), g;
    }
  }) : new Promise((g) => {
    const m = document.getElementById("vkc-popup-gate-root");
    m && m.remove();
    const f = document.createElement("div");
    f.id = "vkc-popup-gate-root", document.body.appendChild(f);
    const h = b(!1), C = b(!1);
    let S = !1, d = !1, A = null;
    const L = () => {
      S || (d = !1, h.value = !1, C.value = !0);
    }, a = (u) => {
      S || (S = !0, d = !1, A && clearTimeout(A), window.removeEventListener("focus", o), e.events.removeUserLoaded(c), l(u), v.unmount(), f.remove(), g(!0));
    }, c = (u) => {
      u && !u.expired && a(u);
    };
    e.events.addUserLoaded(c);
    const o = () => {
      !d || S || (A && clearTimeout(A), A = setTimeout(async () => {
        if (S) return;
        const u = await e.getUser();
        u && !u.expired ? a(u) : L();
      }, 600));
    };
    window.addEventListener("focus", o);
    const n = async () => {
      A && clearTimeout(A), d = !0, h.value = !0;
      try {
        const u = await e.signinPopup();
        a(u);
      } catch (u) {
        console.warn("[v-keycloak-store] Popup fechado ou cancelado:", u), L();
      }
    }, i = p.component || xe, v = we({
      render() {
        return ke(i, {
          opcoes: p,
          carregando: h.value,
          tentarNovamente: C.value,
          acionarLogin: n,
          onAcionarLogin: n
        });
      }
    });
    v.mount(f);
  });
}
function ze(e) {
  if (!(e != null && e.url) || !(e != null && e.realm) || !(e != null && e.clientId))
    throw new Error("As opções url, realm e clientId são obrigatórias para criar a instância de autenticação.");
  const t = e.url.replace(/\/+$/, ""), r = `${t}/realms/${e.realm}`, l = typeof window < "u", p = l ? `${window.location.origin}/` : "", g = e.loginMode || "redirect", m = e.popupOverlay || {}, f = l ? e.storage === "sessionStorage" ? window.sessionStorage : window.localStorage : void 0, h = e.redirectUri || p, C = e.postLogoutRedirectUri || h, S = {
    authority: r,
    client_id: e.clientId,
    redirect_uri: h,
    popup_redirect_uri: e.popupRedirectUri || h,
    post_logout_redirect_uri: C,
    response_type: "code",
    response_mode: "query",
    scope: e.scope || "openid profile email",
    automaticSilentRenew: e.automaticSilentRenew !== !1,
    monitorSession: e.monitorSession !== !1,
    checkSessionIntervalInSeconds: 2,
    silentRequestTimeoutInSeconds: 5,
    filterProtocolClaims: !1,
    loadUserInfo: !1,
    popupWindowFeatures: {
      width: 520,
      height: 640,
      left: l ? Math.max(0, Math.round(window.screenX + (window.outerWidth - 520) / 2)) : 100,
      top: l ? Math.max(0, Math.round(window.screenY + (window.outerHeight - 640) / 2)) : 100,
      ...e.popupWindowFeatures || {}
    },
    ...f ? { userStore: new me({ store: f }) } : {},
    ...e.oidcSettings || {}
  }, d = new ve(S), A = `oidc.user:${r}:${e.clientId}`;
  return {
    userManager: d,
    clientId: e.clientId,
    realm: e.realm,
    url: t,
    loginMode: g,
    popupOverlayConfig: m,
    authenticated: !1,
    token: null,
    idToken: null,
    refreshToken: null,
    tokenParsed: null,
    idTokenParsed: null,
    onAuthLogout: null,
    onAuthError: null,
    onAuthRefreshError: null,
    onTokenExpired: null,
    onUserLoaded: null,
    _storageListenerBound: !1,
    _isLoggingOut: !1,
    _defaultPostLogoutRedirectUri: void 0,
    // Sincroniza os tokens do objeto User do oidc-client-ts com as propriedades do adaptador
    _syncUser(a) {
      a && !a.expired && a.access_token ? (this.authenticated = !0, this.token = a.access_token, this.idToken = a.id_token || null, this.refreshToken = a.refresh_token || null, this.tokenParsed = Y(a.access_token), this.idTokenParsed = a.id_token ? Y(a.id_token) : a.profile || this.tokenParsed) : (this.authenticated = !1, this.token = null, this.idToken = null, this.refreshToken = null, this.tokenParsed = null, this.idTokenParsed = null);
    },
    // Escuta alteracoes no localStorage feitas por outras abas da mesma aplicacao
    _setupCrossTabStorageSync() {
      !l || this._storageListenerBound || e.storage === "sessionStorage" || (this._storageListenerBound = !0, window.addEventListener("storage", async (a) => {
        var o, n;
        if (!a.key || !a.key.endsWith(A)) return;
        if (!a.newValue) {
          this.authenticated && !this._isLoggingOut && (this._syncUser(null), (o = this.onAuthLogout) == null || o.call(this));
          return;
        }
        const c = await d.getUser();
        c && !c.expired && (this._syncUser(c), (n = this.onUserLoaded) == null || n.call(this, c));
      }));
    },
    // Inicializa os listeners de sessao OIDC, processa callbacks e valida a sessao ativa
    async init(a = {}) {
      if (this._isLoggingOut = !1, this._setupCrossTabStorageSync(), d.events.addUserLoaded((o) => {
        var n;
        this._syncUser(o), (n = this.onUserLoaded) == null || n.call(this, o);
      }), d.events.addUserUnloaded(() => {
        var o;
        !this.authenticated || this._isLoggingOut || (this._syncUser(null), (o = this.onAuthLogout) == null || o.call(this));
      }), d.events.addUserSignedOut(async () => {
        var o;
        this._isLoggingOut || (await d.removeUser(), this._syncUser(null), (o = this.onAuthLogout) == null || o.call(this));
      }), d.events.addSilentRenewError((o) => {
        var n;
        (n = this.onAuthRefreshError) == null || n.call(this, o);
      }), d.events.addAccessTokenExpired(() => {
        var o;
        (o = this.onTokenExpired) == null || o.call(this);
      }), l) {
        const o = new URLSearchParams(window.location.search), n = new URLSearchParams(window.location.hash.replace(/^#/, "")), i = o.has("code") && o.has("state") || n.has("code") && n.has("state") || o.has("error") || n.has("error");
        if (window.parent && window.parent !== window && i) {
          try {
            await d.signinSilentCallback();
          } catch {
          }
          return new Promise(() => {
          });
        }
        if (window.opener && window.opener !== window && i) {
          try {
            await d.signinPopupCallback();
          } catch (v) {
            console.error("[v-keycloak-store] Erro no callback do popup:", v);
          }
          return window.close(), new Promise(() => {
          });
        }
        if ((window.location.hash.includes("error=") || window.location.search.includes("error=")) && X(), i)
          try {
            const v = await d.signinRedirectCallback(window.location.href);
            this._syncUser(v), X();
            const u = v == null ? void 0 : v.state;
            return u != null && u.targetUrl && window.history.replaceState({}, document.title, u.targetUrl), !0;
          } catch (v) {
            console.error("[v-keycloak-store] Falha ao processar callback de redirecionamento OIDC:", v), X();
          }
      }
      let c = await d.getUser();
      if (c)
        try {
          c = await d.signinSilent();
        } catch (o) {
          const n = String((o == null ? void 0 : o.message) || o || "").toLowerCase();
          (c != null && c.expired || n.includes("login_required") || n.includes("session_not_active") || n.includes("invalid_grant") || n.includes("interaction_required")) && (await d.removeUser(), c = null);
        }
      return this._syncUser(c), !this.authenticated && (a == null ? void 0 : a.onLoad) === "login-required" ? (await this.login(), this.authenticated) : this.authenticated;
    },
    // Inicia o fluxo de autenticacao via Redirect ou Popup
    async login(a = {}) {
      if (!l || this._isLoggingOut) return;
      if (X(), (a.loginMode || this.loginMode) === "popup") {
        await Pe(
          d,
          this.popupOverlayConfig,
          a.popupOverlay,
          (v) => this._syncUser(v)
        );
        return;
      }
      const n = (a.redirectUri || S.redirect_uri || window.location.origin + window.location.pathname).split("?")[0].split("#")[0], i = a.targetUrl || (a.redirectUri ? a.redirectUri.replace(window.location.origin, "") : window.location.pathname + window.location.search);
      await d.signinRedirect({
        redirect_uri: n,
        state: { targetUrl: i },
        ...a.prompt ? { prompt: a.prompt } : {}
      });
    },
    // Executa login diretamente em janela popup sem overlay intermediario
    async loginPopup(a = {}) {
      const c = await d.signinPopup(a);
      return this._syncUser(c), c;
    },
    // Remove os tokens locais e redireciona para o endpoint de end_session do Keycloak
    async logout(a = {}) {
      this._isLoggingOut = !0;
      const c = this.idToken;
      if (this._syncUser(null), await d.removeUser(), !l) return;
      const o = a.redirectUri || this._defaultPostLogoutRedirectUri || S.post_logout_redirect_uri || `${window.location.origin}/`;
      try {
        await d.signoutRedirect({
          post_logout_redirect_uri: o,
          id_token_hint: c || void 0
        });
      } catch (n) {
        console.error("[v-keycloak-store] Erro ao redirecionar para logout no Keycloak:", n), window.location.replace(o);
      }
    },
    // Verifica se o token expira dentro de minValidity segundos e renova no servidor
    async updateToken(a = 70) {
      if (this._isLoggingOut) return !1;
      const c = await d.getUser();
      if (!c)
        throw this._syncUser(null), new Error("Sem sessão ativa para renovar.");
      if (a !== -1 && c.expires_in !== void 0 && c.expires_in > a)
        return this._syncUser(c), !1;
      try {
        const o = await d.signinSilent();
        if (!o)
          throw new Error("Não foi possível renovar o token.");
        return this._syncUser(o), !0;
      } catch (o) {
        const n = String((o == null ? void 0 : o.message) || o || "").toLowerCase();
        throw (a === -1 || n.includes("login_required") || n.includes("session_not_active") || n.includes("invalid_grant") || n.includes("interaction_required")) && (await d.removeUser(), this._syncUser(null)), o;
      }
    }
  };
}
function Q(e) {
  var t;
  return typeof e != "string" ? "" : ((t = e.replace(/^\/+|\/+$/g, "").split("/").pop()) == null ? void 0 : t.toUpperCase()) ?? "";
}
function Z(e, t) {
  if (!e || !t) return !1;
  const r = Q(t);
  return e.some((l) => Q(l) === r);
}
function ee(e, t) {
  return !t || t.length === 0 ? !0 : t.some((r) => Z(e, r));
}
function te(e, t) {
  return !t || t.length === 0 ? !0 : t.every((r) => Z(e, r));
}
function j(e, t) {
  if (!e || !t) return !1;
  const r = Q(t);
  return e.some((l) => Q(l) === r);
}
function re(e, t) {
  return !t || t.length === 0 ? !0 : t.some((r) => j(e, r));
}
function oe(e, t) {
  return !t || t.length === 0 ? !0 : t.every((r) => j(e, r));
}
const ne = Ae("keycloakStore", () => {
  const t = b(!1), r = b(!1);
  function l(s) {
    r.value = !!s;
  }
  function p(s, w = !0) {
    if (t.value) return;
    w && (t.value = !0);
    const U = (/* @__PURE__ */ new Date()).toLocaleString(), J = typeof window < "u" ? window.location.href : "", ae = { data: U, url: J, motivo: s, fatal: w };
    let D = [];
    if (typeof localStorage < "u") {
      const G = localStorage.getItem("historico_deslogamento");
      if (G)
        try {
          D = JSON.parse(G);
        } catch {
          D = [];
        }
      D.push(ae), D.length > 200 && D.shift(), localStorage.setItem("historico_deslogamento", JSON.stringify(D));
    }
  }
  const g = _e(null);
  function m(s) {
    g.value = s;
  }
  const f = b(""), h = T(() => f.value ? Y(f.value) : null), C = T(() => h.value), S = T(() => !!f.value), d = T(() => f.value ? { Authorization: `Bearer ${f.value}` } : {}), A = b(null), L = b(null), a = b(null), c = b(null), o = b(null), n = b(null), i = b(null), v = b([]), u = b([]), _ = b([]), k = b({});
  function x(s, w) {
    if (!Object.prototype.hasOwnProperty.call(k.value, s)) {
      k.value[s] = w;
      return;
    }
    console.warn(`A chave "${s}" já existe no objeto de extensão. Use removeExtend() antes de adicionar novamente.`);
  }
  function I(s) {
    Object.prototype.hasOwnProperty.call(k.value, s) && delete k.value[s];
  }
  const O = T(() => o.value ? `https://www.gravatar.com/avatar/${Se.SHA256(o.value.trim().toLowerCase()).toString()}?d=identicon` : null);
  function K(s = null) {
    s ? p(s, !0) : t.value = !0;
    const w = g.value ? ce(g.value) : null;
    P(), w && w.logout();
  }
  function E() {
    var D, G, ue, de;
    if (!g.value) return !1;
    const s = g.value;
    r.value && console.log("Keycloak / OIDC Instance:", s), f.value = s.token || "";
    const w = s.idTokenParsed || {}, U = s.tokenParsed || Y(f.value) || {};
    A.value = w.sub || U.sub || null, L.value = w.preferred_username || U.preferred_username || null, a.value = w.given_name || U.given_name || null, c.value = w.name || U.name || null, o.value = w.email || U.email || null;
    const J = w.groups || U.groups || [];
    u.value = Array.isArray(J) ? J : [];
    const ae = /* @__PURE__ */ new Set([
      ...Array.isArray(w.roles) ? w.roles : [],
      ...Array.isArray(U.roles) ? U.roles : [],
      ...Array.isArray((D = w.realm_access) == null ? void 0 : D.roles) ? w.realm_access.roles : [],
      ...Array.isArray((G = U.realm_access) == null ? void 0 : G.roles) ? U.realm_access.roles : [],
      ...s.clientId && Array.isArray((de = (ue = U.resource_access) == null ? void 0 : ue[s.clientId]) == null ? void 0 : de.roles) ? U.resource_access[s.clientId].roles : []
    ]);
    return _.value = Array.from(ae), t.value = !1, r.value && (console.log("User Groups:", u.value), console.log("User Roles:", _.value)), !0;
  }
  function P() {
    f.value = "", A.value = null, L.value = null, a.value = null, c.value = null, o.value = null, n.value = null, i.value = null, k.value = {}, v.value = [], u.value = [], _.value = [];
  }
  function R() {
    if (i.value) return !0;
    if (!Array.isArray(u.value)) return !1;
    const s = [];
    if (s.length === 0) return !1;
    const w = u.value.map(
      (U) => (U.replace(/^\/+|\/+$/g, "").split("/").pop() ?? "").toUpperCase()
    );
    return s.some((U) => w.includes(U));
  }
  function y(s) {
    return i.value ? !0 : v.value.find(
      (w) => w.toLowerCase() === s.toLowerCase()
    );
  }
  function M(s) {
    return i.value ? !0 : R() ? j(u.value, s) : !1;
  }
  function B(s) {
    return i.value ? !0 : Z(_.value, s);
  }
  function F(s) {
    return i.value ? !0 : ee(_.value, s);
  }
  function q(s) {
    return i.value ? !0 : te(_.value, s);
  }
  function $(s) {
    return i.value ? !0 : j(u.value, s);
  }
  function N(s) {
    return i.value ? !0 : re(u.value, s);
  }
  function W(s) {
    return i.value ? !0 : oe(u.value, s);
  }
  async function H(s) {
    const w = g.value ? ce(g.value) : null;
    w && (await w.login(s), E());
  }
  async function pe() {
    const s = g.value ? ce(g.value) : null;
    s && (await s.loginPopup(), E());
  }
  return {
    setKeycloakInstance: m,
    loginAction: H,
    loginPopupAction: pe,
    keycloakInstance: g,
    setModoDebug: l,
    token: f,
    token_decode: h,
    tokenParsed: C,
    authHeader: d,
    groups: u,
    roles: _,
    isAuthenticated: S,
    id: A,
    username: L,
    first_name: a,
    name: c,
    email: o,
    is_staff: n,
    is_superuser: i,
    getDataKeycloak: E,
    is_memberof: M,
    has_perm: y,
    hasRole: B,
    hasAnyRole: F,
    hasAllRoles: q,
    hasGroup: $,
    hasAnyGroup: N,
    hasAllGroups: W,
    removeDataKeycloak: P,
    gravatar: O,
    extend: k,
    setExtend: x,
    removeExtend: I,
    perms: v,
    logoutAction: K,
    hasAccess: R,
    registrarLogDeslogamento: p
  };
});
function Ee(e, t) {
  var h, C;
  if (!e.keycloakInstance || !e.isAuthenticated)
    return !1;
  const r = t.arg, l = t.value, p = !!((h = t.modifiers) != null && h.all), g = !!((C = t.modifiers) != null && C.not), m = Array.isArray(l) ? l : [l];
  let f = !1;
  if (e.is_superuser)
    f = !0;
  else if (r === "role")
    f = p ? te(e.roles, m) : ee(e.roles, m);
  else if (r === "group")
    f = p ? oe(e.groups, m) : re(e.groups, m);
  else
    return console.warn(`[v-keycloak-store] Argumento inválido para diretiva: "${r}". Use :role ou :group.`), !1;
  return g ? !f : f;
}
function Te(e, t) {
  if (e._vkcOriginalState || (e._vkcOriginalState = {
    disabled: e.disabled,
    opacity: e.style.opacity,
    cursor: e.style.cursor,
    pointerEvents: e.style.pointerEvents,
    title: e.getAttribute("title")
  }), !t) {
    "disabled" in e ? e.disabled = !0 : e.style.pointerEvents = "none", e.setAttribute("aria-disabled", "true"), e.style.opacity = "0.5", e.style.cursor = "not-allowed", e.getAttribute("title") || e.setAttribute("title", "Você não possui permissão para realizar esta ação.");
    return;
  }
  const r = e._vkcOriginalState;
  "disabled" in e ? e.disabled = !!r.disabled : e.style.pointerEvents = r.pointerEvents || "", e.removeAttribute("aria-disabled"), e.style.opacity = r.opacity || "", e.style.cursor = r.cursor || "", r.title ? e.setAttribute("title", r.title) : e.removeAttribute("title");
}
function fe(e, t) {
  var g;
  const r = ne(), l = Ee(r, t);
  if (!!((g = t.modifiers) != null && g.disable)) {
    e._vkcComment && e._vkcComment.parentNode && (e._vkcComment.parentNode.replaceChild(e, e._vkcComment), e._vkcComment = null), Te(e, l);
    return;
  }
  if (!l) {
    if (!e._vkcComment && e.parentNode) {
      const m = document.createComment(`v-can:${t.arg || "untyped"}`);
      e._vkcComment = m, e.parentNode.replaceChild(m, e);
    } else e.parentNode || (e.style.display = "none");
    return;
  }
  e._vkcComment && e._vkcComment.parentNode && (e._vkcComment.parentNode.replaceChild(e, e._vkcComment), e._vkcComment = null), e.style.display === "none" && (e.style.display = "");
}
const ge = {
  mounted(e, t) {
    fe(e, t);
  },
  updated(e, t) {
    fe(e, t);
  },
  unmounted(e) {
    const t = e;
    t._vkcComment && t._vkcComment.parentNode && t._vkcComment.parentNode.removeChild(t._vkcComment), t._vkcComment = null, t._vkcOriginalState = null;
  }
};
function he(e) {
  return typeof e == "string" ? [e] : e;
}
function Re(e, t) {
  return t ? typeof t == "string" ? e.path === t : !!("name" in t && t.name && e.name === t.name || "path" in t && t.path && e.path === t.path) : !1;
}
function Ie(e, t) {
  return typeof e == "string" ? { path: e, query: { redirect: t } } : { ...e, query: { redirect: t } };
}
function De(e = {}) {
  const {
    router: t,
    keycloak: r,
    store: l,
    initPromise: p,
    forbiddenRoute: g,
    onForbidden: m,
    onLogin: f,
    rolesMode: h = "any",
    groupsMode: C = "any",
    customRules: S,
    debug: d = !1
  } = e;
  function A() {
    if (l) return l;
    try {
      return ne();
    } catch {
      return null;
    }
  }
  function L(c) {
    return r || (c == null ? void 0 : c.keycloakInstance) || null;
  }
  async function a(c) {
    var v, u;
    const o = A(), n = (o == null ? void 0 : o.roles) || [], i = (o == null ? void 0 : o.groups) || [];
    for (const _ of c.matched) {
      if ((v = _.meta) != null && v.roles) {
        const k = _.meta.rolesMode || h, x = he(_.meta.roles);
        if (!(k === "all" ? te(n, x) : ee(n, x))) return !1;
      }
      if ((u = _.meta) != null && u.groups) {
        const k = _.meta.groupsMode || C, x = he(_.meta.groups);
        if (!(k === "all" ? oe(i, x) : re(i, x))) return !1;
      }
      if (S) {
        const k = await S(_, c);
        if (k === !1) return !1;
        if (k && typeof k == "object") return k;
      }
    }
    return !0;
  }
  return async function(o) {
    var _, k, x, I, O, K;
    const n = A(), i = L(n);
    if (i != null && i._isLoggingOut)
      return !1;
    const v = o.matched.some(
      (E) => {
        var P, R, y;
        return ((P = E.meta) == null ? void 0 : P.requiresAuth) || ((R = E.meta) == null ? void 0 : R.roles) || ((y = E.meta) == null ? void 0 : y.groups);
      }
    );
    if (v && p && await p, v && !!!(n != null && n.token && (i != null && i.authenticated)))
      if (d && console.info(`Acesso negado na rota ${o.path}. Token vazio ou authenticated false.`), (_ = n == null ? void 0 : n.registrarLogDeslogamento) == null || _.call(n, `Bloqueado pelo router na rota ${o.path}. Token vazio ou authenticated false.`), i != null && i.login)
        try {
          d && console.info(`Iniciando login do Keycloak. Rota: ${o.fullPath}`);
          const P = typeof window < "u" && ((k = window.location) != null && k.origin) ? window.location.origin : "", R = P ? `${P}${o.fullPath}` : o.fullPath;
          if (await i.login({ redirectUri: R }), (x = n == null ? void 0 : n.getDataKeycloak) == null || x.call(n), f == null || f(), !i.authenticated)
            return !1;
        } catch (P) {
          return (I = n == null ? void 0 : n.registrarLogDeslogamento) == null || I.call(n, `Erro ao redirecionar para login: ${P}`), (O = n == null ? void 0 : n.removeDataKeycloak) == null || O.call(n), !1;
        }
      else
        return !1;
    if (g && Re(o, g) && ((K = o.query) != null && K.redirect) && t) {
      const E = String(o.query.redirect), P = t.resolve(E);
      if (await a(P) === !0)
        return { path: E };
    }
    const u = await a(o);
    return u === !0 ? !0 : u && typeof u == "object" ? u : (m == null || m(o), g ? Ie(g, o.fullPath) : !1);
  };
}
const Ke = {
  install: (e, t) => {
    if (e.directive("can", ge), e.directive("has", ge), !(t != null && t.keycloak))
      throw new Error("A instância do Keycloak/OIDC deve ser fornecida!");
    if (!t.router)
      throw new Error("O roteador (router) deve ser fornecido!");
    const {
      keycloak: r,
      router: l,
      onReady: p,
      onError: g,
      onLogout: m,
      onLogin: f,
      optionsKeycloak: h,
      refreshTimeout: C,
      deactivateTimeout: S,
      debug: d,
      forbiddenRoute: A,
      logoutRoute: L,
      onForbidden: a,
      rolesMode: c,
      groupsMode: o,
      customRules: n
    } = t, i = ne();
    if (d && (i.setModoDebug(!0), console.info("[v-keycloak-store] Modo debug ativado.")), L && typeof window < "u") {
      const y = l.resolve(L);
      r._defaultPostLogoutRedirectUri = new URL(y.href, window.location.origin).href;
    }
    i.setKeycloakInstance(r);
    let v = null, u = Date.now(), _ = !1, k = !1;
    const x = () => {
      v !== null && (clearInterval(v), v = null);
    }, I = () => {
      var B, F, q;
      if (L) {
        l.push(L);
        return;
      }
      const y = (B = l.currentRoute) == null ? void 0 : B.value;
      if ((F = y == null ? void 0 : y.matched) == null ? void 0 : F.some(
        ($) => {
          var N, W, H;
          return ((N = $.meta) == null ? void 0 : N.requiresAuth) || ((W = $.meta) == null ? void 0 : W.roles) || ((H = $.meta) == null ? void 0 : H.groups);
        }
      )) {
        const $ = typeof window < "u" && ((q = window.location) != null && q.origin) ? window.location.origin : "", N = $ && (y != null && y.fullPath) ? `${$}${y.fullPath}` : void 0;
        r.login({ redirectUri: N });
      }
    };
    r.onUserLoaded = () => {
      i.getDataKeycloak();
    };
    const O = async (y = !1) => {
      if (!(!r.authenticated || r._isLoggingOut || k)) {
        k = !0;
        try {
          const M = y ? -1 : 70, B = await r.updateToken(M);
          u = Date.now(), B && (d && console.info("[v-keycloak-store] Token renovado e sincronizado com sucesso."), i.getDataKeycloak());
        } catch {
          if (!r.authenticated) {
            x(), i.registrarLogDeslogamento(
              "Sessão encerrada remotamente no servidor SSO ou token expirado sem renovação.",
              !0
            ), i.removeDataKeycloak(), m == null || m(), I();
            return;
          }
          i.registrarLogDeslogamento("Oscilação de rede no refreshAndSync, mantendo sessão local ativa.", !1);
        } finally {
          k = !1;
        }
      }
    }, K = () => {
      if (typeof document > "u" || _) return;
      _ = !0;
      const y = () => {
        if (document.visibilityState !== "visible" || !r.authenticated || r._isLoggingOut) return;
        Date.now() - u > 2e3 && (u = Date.now(), O(!0));
      };
      document.addEventListener("visibilitychange", y), typeof window < "u" && window.addEventListener("focus", y);
    }, E = () => {
      x(), v = setInterval(() => {
        O(!1);
      }, C || 9e4);
    }, P = r.init({
      ...h
    }).then((y) => {
      i.getDataKeycloak(), y && (f == null || f()), p == null || p(), r.onAuthLogout = () => {
        x(), i.registrarLogDeslogamento("Sessão encerrada (onAuthLogout / outra aba ou SSO)."), i.removeDataKeycloak(), m == null || m(), I();
      }, r.onAuthError = (M) => {
        const B = M ? JSON.stringify(M) : "Erro desconhecido";
        i.registrarLogDeslogamento(`Evento onAuthError disparado: ${B}`, !1);
      }, r.onAuthRefreshError = () => {
        i.registrarLogDeslogamento("Falha na renovação silenciosa do token em background.", !1);
      }, r.onTokenExpired = () => {
        i.registrarLogDeslogamento("Token expirado, acionando refreshAndSync.", !1), O(!1);
      }, S !== !0 && (E(), K());
    }).catch((y) => {
      i.registrarLogDeslogamento(`Erro no init da autenticação: ${(y == null ? void 0 : y.message) || y}`, !1), g ? g(y) : console.error("[v-keycloak-store] Falha ao inicializar autenticação:", y), p == null || p();
    }), R = De({
      router: l,
      keycloak: r,
      store: i,
      initPromise: P,
      forbiddenRoute: A,
      onForbidden: a,
      onLogin: f,
      rolesMode: c,
      groupsMode: o,
      customRules: n,
      debug: d
    });
    l.beforeEach(R);
  }
};
function Ne(e) {
  const t = e || ne();
  return {
    hasRole: (h) => t != null && t.is_superuser ? !0 : Z(t == null ? void 0 : t.roles, h),
    hasAnyRole: (h) => t != null && t.is_superuser ? !0 : ee(t == null ? void 0 : t.roles, h),
    hasAllRoles: (h) => t != null && t.is_superuser ? !0 : te(t == null ? void 0 : t.roles, h),
    hasGroup: (h) => t != null && t.is_superuser ? !0 : j(t == null ? void 0 : t.groups, h),
    hasAnyGroup: (h) => t != null && t.is_superuser ? !0 : re(t == null ? void 0 : t.groups, h),
    hasAllGroups: (h) => t != null && t.is_superuser ? !0 : oe(t == null ? void 0 : t.groups, h)
  };
}
export {
  Ke as KeycloakPlugin,
  De as createAuthGuard,
  ze as createKeycloak,
  Y as parseJwt,
  ne as useKeycloakStore,
  Ne as usePermissions
};
