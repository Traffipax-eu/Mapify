const RECOVER_FLAG = "mapify_recover";

/** Full page reset — bypasses SPA router state and stale error boundaries. */
export function hardResetApp(): void {
  try {
    sessionStorage.clear();
    localStorage.setItem(RECOVER_FLAG, String(Date.now()));
  } catch {
    // ignore storage errors
  }

  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("recover", String(Date.now()));
  window.location.replace(url.toString());
}

export function consumeRecoverFlag(): boolean {
  try {
    const hadFlag = Boolean(localStorage.getItem(RECOVER_FLAG));
    localStorage.removeItem(RECOVER_FLAG);
    return hadFlag;
  } catch {
    return false;
  }
}
