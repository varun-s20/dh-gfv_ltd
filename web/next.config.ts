import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Safari applies upgrade-insecure-requests even to http://localhost, which breaks a
// local production build; only drop it when the site is explicitly served over http.
const upgradeRequests = !isDev && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://");

// Static CSP (no nonces) so marketing pages stay prerendered. Third parties are
// limited to Google Tag Manager / Analytics / Ads and Cloudflare Turnstile.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.google.co.uk https://googleads.g.doubleclick.net",
  "font-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.google.com",
  "frame-src https://challenges.cloudflare.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(upgradeRequests ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // The route badge sat over the quote form's Back button on phones. Errors still surface without it.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Native / WASM packages that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Social cards read the car cut-out from disk at request time.
  outputFileTracingIncludes: { "/**/opengraph-image*": ["./public/media/og/hero-side.png"] },
  // CI runs `npm run typecheck` separately; this escape hatch is for local perf builds only.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === "1" },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    deviceSizes: [390, 640, 828, 1080, 1280, 1600, 1920, 2400],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/offer/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  async redirects() {
    return [
      { source: "/sell-my-ev", destination: "/sell-my-electric-car", permanent: true },
      { source: "/sell-my-electric-vehicle", destination: "/sell-my-electric-car", permanent: true },
      { source: "/sell-my-van", destination: "/sell-my-electric-van", permanent: true },
      { source: "/about", destination: "/why-sell-to-us", permanent: true },
    ];
  },
};

export default nextConfig;
