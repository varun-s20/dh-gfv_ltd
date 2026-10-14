# Admin guide

The admin at `/admin` is where the team reads quote requests, sends offers, follows each deal to collection and keeps the landing pages up to date. It works on a phone as well as a desktop.

Part 1 is for the people using it. Part 2 is for developers.

---

## Part 1: Using the admin

### Signing in

Go to `/admin` and sign in with your email address and password. If two-step verification is on for your account, you'll then be asked for the 6-digit code from your authenticator app.

- After five wrong passwords for the same email in 15 minutes, sign-in is paused for 15 minutes.
- You stay signed in for up to 7 days, or 8 hours without using the admin, whichever comes first.
- Locked out, forgotten your password or lost your phone? An owner can reset it under **Settings › Team**.

### Dashboard

The first screen answers "what needs doing now?":

- **New leads today** and in the last 7 days.
- **Awaiting first reply**: new leads nobody has answered yet, and how long the oldest has waited. It turns red once anyone has waited more than 2 hours.
- **Offers sent**, **offers accepted** and **offer → accepted** over the last 30 days.
- **Median first reply**: the typical time from a seller submitting to our first contact.
- **Needs attention**: new leads waiting more than 2 hours, oldest first. Work down this list.
- **Recent leads**, plus leads by vehicle type and by marketing channel.

### Leads

Search by reference (GF-…), name, registration (with or without the space), email or phone number. The tabs filter by status; **Filters** adds vehicle type, channel, Google Ads campaign, dates and order. Every view has its own web address, so you can bookmark it or send it to a colleague. **Export CSV** downloads exactly what's on screen (all pages).

Status colours are the same everywhere:

| Status | Colour | Meaning |
|---|---|---|
| New | Yellow | Nobody has replied yet |
| Contacted | Blue | We've been in touch |
| Quoted | Green | An offer is with the seller |
| Accepted | Green | The seller said yes: arrange collection |
| Rejected | Red | The seller declined, or we passed |
| Closed | Grey | Finished (bought, or no longer going ahead) |

### A lead

At the top: the plate, the vehicle, the reference, and buttons to **call**, **WhatsApp** (opens with a message that already quotes the reference) or **email** the seller. The button for the way they prefer to be contacted is highlighted. Use **Mark as contacted** as soon as you've replied, so the dashboard knows; change the status at any time with the status box.

Below that: their photos (click or tap one to enlarge; use the arrow keys to move through them), everything they told us, where they came from (Google Ads campaign, keyword and so on) and a timeline of everything that has happened, including every email and WhatsApp message with its delivery status. Add notes for the team at the top of the timeline.

**Making an offer**

1. Type the amount in pounds. The standard conditions are filled in from Settings; change them if this car needs something different. Internal notes are for the team only.
2. Check the preview. It shows the email subject and text and the WhatsApp message exactly as the seller will get them.
3. Tick how to send it. WhatsApp is ticked automatically when that's what the seller prefers.
4. **Save draft** keeps it for later. **Send offer** asks you to confirm, then sends it and gives the seller a link to accept or decline online.

Sending a new offer replaces any earlier one (the old link stops working). Saving a draft doesn't touch an offer the seller already has. **Offer history** lists every version with what happened to it: draft, sent, viewed, accepted, declined (with their reason), expired or superseded.

Until WhatsApp is connected (see Part 2), WhatsApp messages are *simulated*: they're logged but not delivered, and the builder says so.

**Recording a purchase**: when the car is collected and paid for, enter the price actually paid under **Record purchase**. This closes the lead and feeds the reports and Google Ads.

### Reports

Pick 7, 30 or 90 days or your own dates. Leads are counted in the period they arrived and followed through the funnel: **leads → offer sent → accepted → closed (bought)**, with totals, reply times and breakdowns by vehicle, channel and Google Ads campaign.

**Google Ads CSV** downloads the purchases that came from a Google Ads click, in the format Google asks for. In Google Ads go to **Goals › Conversions › Uploads**, choose *Conversions from clicks*, and upload the file. Doing this weekly teaches Google which clicks turn into cars bought, not just form fills. The conversion name must match the conversion action in Google Ads exactly; set it under **Settings › Google Ads**.

### Content

Edit the headline, introduction, button label, closing call to action and the Google title and description for each of the three landing pages (Tesla, electric car, electric van).

- Each box shows the current wording in grey. Type to replace it; empty the box to go back to the original.
- Put `*asterisks*` around a word or two in a headline to set them in the quieter grey tone, like the rest of the site.
- Google cuts titles off after about 60 characters and descriptions after about 160; the counters help.
- **Save and publish** puts the change live straight away. **Reset to default** puts the original wording back. **View live page** opens the page in a new tab.

### Settings

- **Notifications** (owners): who gets an email for every new lead and every accepted or declined offer.
- **Offer defaults** (owners): the standard conditions and how many days an offer stays valid.
- **Google Ads** (owners): the offline conversion name.
- **My account**: change your password (at least 12 characters; other devices are signed out), turn two-step verification on or off, and sign out other devices.
- **Team** (owners): add someone (a temporary password is shown once; give it to them in person or by phone and ask them to change it), reset a password, disable or re-enable an account, and change between owner and staff. There must always be at least one active owner.

Owners can do everything. Staff can work leads, send offers, see reports and edit landing-page content, but can't change business settings or the team.

---

## Part 2: For developers

### Routes

| Path | What |
|---|---|
| `/admin/login`, `/admin/login/verify` | Sign-in and TOTP step (`src/app/admin/(auth)`) |
| `/admin` | Dashboard |
| `/admin/leads`, `/admin/leads/[id]` | Lead list (filters in `searchParams`) and lead detail with quote builder |
| `/admin/reports` | Reports (`?range=7|30|90` or `?range=custom&from=yyyy-mm-dd&to=yyyy-mm-dd`) |
| `/admin/content` | Landing-page copy (`?page=tesla|ev|van`) |
| `/admin/settings` | Settings, account, team |
| `GET /api/admin/photos/[photoId]` | Seller photo, admins only. Streams with `Cache-Control: private`; `?download=1` redirects to a signed URL when the storage driver supports it |
| `GET /api/admin/leads/export` | Leads CSV for the same query string as the list |
| `GET /api/admin/conversions/export` | Google Ads offline conversions CSV (`?from=&to=` on conversion date) |
| `GET/POST /api/webhooks/whatsapp` | Meta webhook: verification handshake and signed delivery/inbound events |
| `GET/POST /api/cron/sweep` | Daily clean-up, `Authorization: Bearer $CRON_SECRET` (scheduled in `vercel.json`) |

Code lives in `src/app/admin/**`, `src/components/admin/**`, `src/lib/admin/**` and the API folders above.

### Running locally

```bash
npm run db:migrate
ADMIN_PASSWORD='a-long-local-password' npm run admin:create -- --email you@example.com --name "Your Name" --role owner
npm run db:seed        # optional demo data (stop `next dev` first: embedded PGlite allows one process)
npm run dev
```

`npm run db:seed` runs `scripts/seed.ts`: about 30 leads over the last 45 days across Teslas, electric cars and vans, every status, Google Ads (`tesla-core` / `ev-core` / `van-core` with gclids), organic, direct and referral traffic, offers in every state, timeline events, messages with delivery statuses and placeholder photos, plus a demo staff account. People are obviously fake (`@example.com`, Ofcom drama numbers 07700 900xxx). Re-running replaces the previous demo data (it deletes leads with `@example.com` emails). It refuses to run when `NODE_ENV=production` or when `DATABASE_URL` points anywhere but localhost. Like `create-admin.ts`, it imports only the DB client, schema, password hashing and storage, never modules that touch `next/headers` or `next/navigation`.

To run a second copy alongside another dev server, give it its own build folder and database:

```bash
NEXT_DIST_DIR=.next-admin PGLITE_DIR=.data/pglite-admin npx next dev --port 3001
```

### Environment

| Variable | Used for |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | The token you type into Meta's webhook settings; the GET handshake must match it |
| `WHATSAPP_APP_SECRET` | Meta app secret; every webhook POST must carry a valid `X-Hub-Signature-256` HMAC of the raw body. Unset = webhook answers 503 |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Real WhatsApp sending; unset = simulated (the quote builder warns) |
| `CRON_SECRET` | Bearer token for `/api/cron/sweep` (16+ characters). Unset = the route always answers 401 |
| `ADMIN_NOTIFY_EMAILS` | Extra alert recipients on top of Settings › Notifications |

WhatsApp webhook set-up in Meta: callback URL `https://<site>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to the `messages` field. Delivery receipts (`sent`, `delivered`, `read`, `failed`) update `messages.status` by provider id and only ever move forward (a late "delivered" can't undo "read"). An inbound message from a number that matches a lead's phone is added to that lead's timeline once, even if Meta retries.

### Settings keys

| Key | Shape |
|---|---|
| `notify.emails` | `string[]` |
| `quote.defaults` | `{ conditions: string, validDays: number }` (1–30) |
| `ads.conversionName` | `string` (default "Vehicle purchased") |

Landing-page overrides are stored in `content_blocks` under `landingKey(category)` (`landing.tesla` etc.) in the `LandingOverride` shape. Saving calls `updateTag(CONTENT_TAG)` so the cached public pages refresh on the next visit.

### How it's built

- **Auth.** Every admin page calls `requireAdminPage()` (which is `connection()` + `requireAdmin()`), every Server Action calls `requireAdmin()` (with `{ role: "owner" }` for business settings and team actions), and every API route calls `adminForApi()` and answers 401/403. `src/proxy.ts` only does the optimistic redirect. A session that has passed the password but not the TOTP step is refused everywhere.
- **Cache Components.** The console layout is static and never reads the session at its top level: the sidebar counts and signed-in user stream in behind their own `<Suspense>` boundaries, and each page sits inside its `loading.tsx` boundary. Admin data is never cached; mutations call `refresh()`, and content saves call `updateTag(CONTENT_TAG)` too.
- **Sign-in.** Rate limited to 5 attempts per 15 minutes per (IP hash, email) plus a looser per-IP cap; unknown and disabled accounts still run a full Argon2 check (`burnPasswordCheck`) so timing doesn't reveal which emails exist; one generic error message; any old session is destroyed first; `?next=` is only honoured for `/admin…` paths. TOTP codes are single-use (a used code is remembered for 2 minutes) and limited to 5 tries per session.
- **Validation.** Every Server Action validates its input with zod and confirms the lead, quote or account exists before acting. Pounds are typed and stored as pence.
- **Offers.** "Send offer" reuses the current draft (or calls `createQuote`), restarts its validity from the moment it's sent, supersedes older open versions, then `issueOfferToken` → `deliverOffer`. The builder's preview is rendered from the real `sellerOfferEmail` / `whatsappOffer` templates on the server with placeholders, so it can't drift from what sellers receive.
- **Exports.** CSVs follow RFC 4180 (quoted fields, CRLF) and neutralise spreadsheet formulas: text starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`. The leads CSV has a UTF-8 BOM for Excel; the Google file doesn't. Conversion times are `yyyy-MM-dd HH:mm:ssZ` in Europe/London (e.g. `2026-07-01 13:00:00+0100`). Every export is written to the audit log.
- **Photos.** Never public. Inline views stream through the authenticated route because the site CSP only allows images from this origin; only `?download=1` redirects to a short-lived signed URL.
- **Audit log.** Sign-ins (and failures, lock-outs), status changes, notes, offers, purchases, content edits, settings changes, account and team changes and exports are all recorded in `audit_log`.
- **Charts** are plain SVG/HTML, one hue per series, with values in text and a table view for the daily chart.

### Tests

`npx vitest run` covers the admin's pure logic in `tests/unit/admin-*.test.ts`: the CSV builder and formula protection, the Google Ads conversion formatter (including BST/GMT changeovers), the webhook signature check and payload parsing, the lead filters and search normalisation, money parsing and the `?next=` guard.

### Known limitations

- There is no "must change password" flag in the schema, so people given a temporary password are asked (not forced) to change it.
- Inbound WhatsApp messages are matched on the exact E.164 phone number; a seller writing from a different number won't be matched.
- Google rejects conversions for clicks older than 90 days; the export includes them and Google skips them on import.
- HEIC photos (some iPhones) can't be shown in most desktop browsers; the gallery offers a download instead.
