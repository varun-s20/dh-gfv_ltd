"use client";

import { CONSENT_COOKIE, CONSENT_VERSION } from "./consent-script";

export type ConsentChoice = { analytics: boolean; marketing: boolean };

type Gtag = (...args: unknown[]) => void;
type TagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
  __gfLoadTags?: () => void;
};

const tagWindow = () => (typeof window === "undefined" ? undefined : (window as TagWindow));

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as { a?: boolean; m?: boolean; v?: number };
    if (parsed.v !== CONSENT_VERSION) return null;
    return { analytics: Boolean(parsed.a), marketing: Boolean(parsed.m) };
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice) {
  const value = encodeURIComponent(JSON.stringify({ a: choice.analytics, m: choice.marketing, v: CONSENT_VERSION }));
  const secure = location.protocol === "https:" ? "; Secure" : "";
  // Six months, the ICO's suggested maximum before asking again.
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 182}; Path=/; SameSite=Lax${secure}`;

  const w = tagWindow();
  w?.gtag?.("consent", "update", {
    analytics_storage: choice.analytics ? "granted" : "denied",
    ad_storage: choice.marketing ? "granted" : "denied",
    ad_user_data: choice.marketing ? "granted" : "denied",
    ad_personalization: choice.marketing ? "granted" : "denied",
  });
  if (choice.analytics || choice.marketing) w?.__gfLoadTags?.();
  window.dispatchEvent(new CustomEvent("gf:consent", { detail: choice }));
}

/** Push a structured event to the dataLayer. Safe to call before GTM loads. */
export function track(event: string, params: Record<string, unknown> = {}) {
  const w = tagWindow();
  if (!w) return;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...params });
}

/* ---------- first-touch attribution (UTM + click IDs) ---------- */

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbclid?: string;
  msclkid?: string;
  landingPage?: string;
  referrer?: string;
};

const ATTRIBUTION_KEY = "gf_attr_v1";
const PARAMS: Array<[keyof Attribution, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
  ["gclid", "gclid"],
  ["gbraid", "gbraid"],
  ["wbraid", "wbraid"],
  ["fbclid", "fbclid"],
  ["msclkid", "msclkid"],
];

/** Record where this visit came from. A new ad click replaces the stored touch. */
export function captureAttribution() {
  try {
    const url = new URL(window.location.href);
    const fromUrl: Attribution = {};
    for (const [key, param] of PARAMS) {
      const value = url.searchParams.get(param);
      if (value) fromUrl[key] = value.slice(0, 255);
    }
    const existing = readAttribution();
    const hasNewTouch = Object.keys(fromUrl).length > 0;
    if (existing && !hasNewTouch) return;
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined;
    const next: Attribution = {
      ...fromUrl,
      landingPage: (url.pathname + url.search).slice(0, 500),
      referrer: ref?.slice(0, 500),
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); attribution is best-effort.
  }
}

export function readAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
