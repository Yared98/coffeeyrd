/**
 * Token de facilitador fora da barra de endereço (openspec/specs/facilitator-token/spec.md).
 *
 * O token fica só no armazenamento do navegador. Links antigos (`?token=`) e o link de facilitador
 * (`#token=`) são lidos uma vez, guardados e removidos da URL, para que copiar a barra de endereço
 * nunca compartilhe o controle da sessão. O fragmento (`#`) não é enviado ao servidor, a logs nem no Referer.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;
const storageKey = (sessionId: string) => `coffee_token_${sessionId}`;

export function storeFacilitatorToken(sessionId: string, token: string): void {
  try {
    localStorage.setItem(storageKey(sessionId), token);
    sessionStorage.setItem(storageKey(sessionId), token);
  } catch {
    /* armazenamento bloqueado: o token vale só nesta aba, em memória */
  }
}

export function getStoredFacilitatorToken(sessionId: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(sessionId)) || localStorage.getItem(storageKey(sessionId));
  } catch {
    return null;
  }
}

/** Lê `#token=` ou `?token=`, guarda para a sessão e limpa a barra de endereço. */
export function consumeTokenFromUrl(sessionId: string | null): string | null {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const raw = hashParams.get('token') || url.searchParams.get('token');
  if (!raw) return null;

  url.searchParams.delete('token');
  hashParams.delete('token');
  const restHash = hashParams.toString();
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${restHash ? `#${restHash}` : ''}`);

  if (!TOKEN_PATTERN.test(raw)) return null;
  if (sessionId) storeFacilitatorToken(sessionId, raw);
  return raw;
}

/** Link explícito para cofacilitar ou abrir em outro dispositivo; o token vai no fragmento. */
export function buildFacilitatorLink(sessionId: string, token: string): string {
  return `${window.location.origin}/session/${sessionId}#token=${encodeURIComponent(token)}`;
}

export function buildParticipantLink(sessionId: string): string {
  return `${window.location.origin}/session/${sessionId}`;
}
