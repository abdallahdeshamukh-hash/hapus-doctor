import { Platform } from 'react-native';
import { supabase } from './supabase';

// ------------------------------------------------------------------
// Password-recovery link handling
//
// Why this exists: GitHub Pages has no SPA fallback, so a recovery link to
// /reset is served 404.html, which stashes the intended path (search + hash)
// and bounces to the app root. supabase-js only reads the URL once, when the
// client is constructed — by then the browser is on '/' with no token, and the
// later client-side navigation to /reset never re-runs detection. The token was
// therefore never consumed and the screen reported a perfectly good link as
// expired.
//
// This parses whatever Supabase actually sent and establishes the session
// explicitly. All three link shapes are covered so the fix does not depend on
// which email template or auth flow the project is configured with.
// ------------------------------------------------------------------

export type RecoveryOutcome =
  | { status: 'none' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

type Parts = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenHash: string | null;
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

function parse(href: string): Parts {
  let search = new URLSearchParams();
  let hash = new URLSearchParams();
  try {
    const u = new URL(href, 'https://placeholder.invalid');
    search = u.searchParams;
    hash = new URLSearchParams(u.hash.replace(/^#/, ''));
  } catch {
    /* leave both empty */
  }
  // Supabase puts tokens in the query (PKCE / OTP) or the fragment (implicit).
  const get = (k: string) => search.get(k) ?? hash.get(k);
  return {
    code: get('code'),
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    tokenHash: get('token_hash'),
    type: get('type'),
    errorCode: get('error_code') ?? get('error'),
    errorDescription: get('error_description'),
  };
}

/** True when a URL carries anything that looks like an auth redirect. */
export function hasRecoveryParams(href: string): boolean {
  const p = parse(href);
  return !!(p.code || p.accessToken || p.tokenHash || p.errorCode || p.errorDescription);
}

/** The path portion of a stashed redirect, with token params stripped. */
export function pathOnly(href: string): string {
  const [path] = href.split(/[?#]/);
  return path || '/';
}

/**
 * Exchange the tokens in `href` for a session. Returns 'none' when the URL has
 * no auth params, so callers can tell "nothing to do" from "tried and failed".
 */
export async function consumeRecoveryParams(href: string): Promise<RecoveryOutcome> {
  const p = parse(href);

  // Supabase appends error params when a one-time link was already used or has
  // expired — mail scanners frequently open these links before the farmer does.
  if (p.errorCode || p.errorDescription) {
    return { status: 'error', message: p.errorDescription ?? p.errorCode ?? 'link' };
  }

  try {
    if (p.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(p.code);
      return error ? { status: 'error', message: error.message } : { status: 'ok' };
    }
    if (p.tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        type: (p.type as 'recovery') ?? 'recovery',
        token_hash: p.tokenHash,
      });
      return error ? { status: 'error', message: error.message } : { status: 'ok' };
    }
    if (p.accessToken && p.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: p.accessToken,
        refresh_token: p.refreshToken,
      });
      return error ? { status: 'error', message: error.message } : { status: 'ok' };
    }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : String(err) };
  }

  return { status: 'none' };
}

/** Drop token params from the address bar once they have been consumed. */
export function cleanUrl(): void {
  if (Platform.OS !== 'web') return;
  try {
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
  } catch {
    /* history API unavailable — cosmetic only */
  }
}
