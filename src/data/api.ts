import { API_URL, GOOGLE_CLIENT_ID } from '../config';
import type { DB } from './types';

// Talks to the Apps Script back office. Every request carries the person's Google sign-in
// token; the back office checks it and only returns what that person may see.

const TOKEN_KEY = 'huddle-id-token';

export class SignInNeeded extends Error {}

function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}
export function tokenEmail(token = getToken()): string {
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email ?? '';
  } catch {
    return '';
  }
}
export function getToken(): string | null {
  try {
    const t = sessionStorage.getItem(TOKEN_KEY);
    return t && tokenExpiry(t) > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* kept for this page only */
  }
}

export async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new SignInNeeded('Please sign in.');
  // text/plain keeps this a "simple" request, which Apps Script accepts from another site.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, ...body }),
  });
  const data = await res.json();
  if (!data.ok) {
    if (/sign in|sign-in expired/i.test(data.error)) {
      setToken(null);
      throw new SignInNeeded(data.error);
    }
    throw new Error(data.error || 'Something went wrong.');
  }
  return data as T;
}

export type Loaded = { me: string; db: DB; guildId: string };
export const load = () => call<Loaded>('load');

// ---------- Google sign-in button ----------
declare global {
  interface Window { google?: any }
}
let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Couldn’t load Google sign-in. Check your connection.'));
      document.head.appendChild(s);
    });
  }
  return gisLoading;
}

export async function renderSignIn(el: HTMLElement, onToken: (t: string) => void) {
  await loadGis();
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    auto_select: true, // returning people are signed straight back in
    callback: (r: { credential: string }) => { setToken(r.credential); onToken(r.credential); },
  });
  window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
  window.google.accounts.id.prompt();
}

export function signOut() {
  setToken(null);
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* not loaded */ }
}
