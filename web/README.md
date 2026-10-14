# Green Future — EV buying platform

Lead-generation website and admin for **Green Future Vehicles Limited**: UK owners sell their Tesla, electric car or electric van through a five-step quote form, the team prices each vehicle by hand in the admin, and the offer goes back by email or WhatsApp with a link to accept online.

Built by Digital Heroes.

## What's in the box

| Area | Where | Notes |
|---|---|---|
| Marketing site | `src/app/(marketing)` | Home, three Google Ads landing pages (`/sell-my-tesla`, `/sell-my-electric-car`, `/sell-my-electric-van`), How it works, Why us, Makes we buy, FAQ, Contact, Privacy, Terms, Cookies |
| Quote form | `src/app/quote`, `src/components/quote` | 5 steps, guided photo upload with in-browser compression, autosave on the device, browser Back moves between steps |
| Offer page | `src/app/offer/[token]` | Seller views the firm offer and accepts or declines |
| Admin | `src/app/admin` | Leads, quote builder, WhatsApp/email sending, reports, content editing, team and 2FA (see `docs/ADMIN.md`) |
| Data | `src/lib/db/schema.ts`, `drizzle/` | Postgres via Drizzle ORM; embedded PGlite for local development |
| Messaging | `src/lib/notify` | Postmark email + WhatsApp Cloud API, both with a local outbox when not configured |
| Tracking | `src/lib/analytics` | Google Consent Mode v2 (basic mode), GTM, dataLayer events, UTM + gclid capture onto every lead |
| Content | `src/content`, `src/lib/content.ts` | Copy in code, editable overrides from the admin; photography registry with licences in `src/content/photo-credits.json` |

## Getting started

Requirements: Node 20.9+ (tested on 24), npm.

```bash
npm install
cp .env.example .env.local        # everything is optional for local development
npm run db:migrate                # creates the embedded database in .data/pglite
npm run admin:create -- --email you@example.com --name "Your Name" --role owner
npm run db:seed                   # optional demo leads for the admin
npm run dev                       # http://localhost:3000
```

Without credentials, emails and WhatsApp messages are written to `.data/outbox/` instead of being sent, and photos are stored under `.data/uploads/`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint (Next.js + React Hooks rules) |
| `npm test` | Unit tests (Vitest): form rules, UK formats, TOTP, CSV/exports |
| `npm run test:e2e` | End-to-end + accessibility (Playwright: Chrome, Firefox, Safari, Pixel, iPhone) |
| `npm run db:generate` | New SQL migration after editing `schema.ts` |
| `npm run db:migrate` | Apply migrations (`DATABASE_URL` or local PGlite) |
| `npm run admin:create` | Create an admin or reset their password |
| `npm run uploads:sweep` | Delete photos uploaded but never attached to a lead |

## Architecture notes

- **Next.js 16 with Cache Components.** Marketing pages are fully static and served from the CDN; the landing pages are cached for a day and refreshed instantly when content is edited in the admin (`updateTag("content")`). The quote and offer pages are partially prerendered: the shell is static and the request-specific part streams in.
- **Security.** Argon2id passwords, database-backed sessions in an `HttpOnly` `__Host-` cookie, optional TOTP 2FA, Postgres-backed rate limits, Cloudflare Turnstile, honeypot, magic-byte checks on uploads, HMAC receipts so a lead can only claim photos uploaded through our endpoint, private photo storage served only through an authenticated route, static CSP and security headers (`next.config.ts`).
- **Privacy.** Nothing non-essential loads before consent; IPs are stored only as keyed hashes; photos and unconverted leads have documented retention periods (see the privacy notice).
- **Performance.** No WebGL or video on landing pages; hero photography through `next/image` (AVIF/WebP, responsive sizes); minimal client JavaScript; fonts self-hosted by `next/font` with only the critical faces preloaded. Mobile Lighthouse ≈ 90 locally (teammate prototype: 72–76).

## Deploying

Recommended: **Vercel** (app) + **Supabase** or **Neon** (Postgres, London region) + **Cloudflare R2** or Supabase Storage (S3-compatible photo bucket) + **Postmark** (email) + **Meta WhatsApp Cloud API**.

1. Create the Postgres database and set `DATABASE_URL` (use the pooled connection string).
2. Create a private bucket and set `STORAGE_DRIVER=s3` plus the `S3_*` variables.
3. Set every variable marked *required in production* in `.env.example`.
4. Run `npm run db:migrate` against production, then `npm run admin:create` for Danny.
5. Add a Vercel Cron job (daily) calling `/api/cron/sweep` with `Authorization: Bearer $CRON_SECRET`.
6. Point the domain, then work through **LAUNCH.md** before switching on Google Ads.

## Further docs

- `LAUNCH.md` — pre-launch checklist and everything the client must confirm
- `docs/ADMIN.md` — admin guide (written guide for the client)
- `docs/TRACKING.md` — GTM, GA4, Google Ads conversions and the dataLayer
- `docs/WHATSAPP_TEMPLATES.md` — templates to submit to Meta for approval
- `docs/GOOGLE_ADS.md` + `docs/google-ads/*.csv` — campaign plan and Google Ads Editor import files
