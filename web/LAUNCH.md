# Launch checklist

Work through this before the domain goes live and before any Google Ads campaign is unpaused. Items marked **Client** need Danny's written confirmation; keep his replies with the project.

## 1. Business facts shown on the site (Client)

All live in `src/lib/site.ts` or environment variables.

- [ ] Consumer brand name. The build uses **Green Future Vehicles** (one company for VAT, reviews, Ads and Meta verification). "We Buy Any EV/Tesla" carry trade-mark and passing-off risk; EV 2 Trade Ltd appears to be Danny's wholesale company. Confirm, and run the free UKIPO search on the chosen name.
- [ ] Company number, registered office, VAT number (taken from Companies House and greenfuturevehicles.com).
- [ ] **ICO registration number** — required in the privacy notice and footer (`NEXT_PUBLIC_ICO_NUMBER`).
- [ ] Phone number and **WhatsApp Business number** (`NEXT_PUBLIC_PHONE_*`, `NEXT_PUBLIC_WHATSAPP_NUMBER`).
- [ ] Public contact email (`NEXT_PUBLIC_CONTACT_EMAIL`) and opening hours.
- [ ] Showroom wording ("Hertford, by appointment").
- [ ] Social profile URLs, or leave empty to hide icons.

## 2. Commercial promises (Client)

Each is a switch in `site.promises`; switching one off removes the claim everywhere.

- [ ] No fees to the seller.
- [ ] Free collection, and the coverage area (mainland GB?).
- [ ] Payment by bank transfer **before** the vehicle is taken.
- [ ] Outstanding finance settled directly with the lender.
- [ ] Offer validity: 7 days.
- [ ] Quote turnaround wording: "the same working day".
- [ ] The **Firm Offer Promise** and its three published reasons a price can change (`src/content/shared.ts` → `firmOfferChanges`), including the "more than 1,000 miles" tolerance.
- [ ] Comparison table wording about instant valuation sites and dealer auctions (keep it general; never name a competitor or quote their fees without a dated source).

## 3. Legal pages (Client + ideally a solicitor)

- [ ] Privacy notice: suppliers listed match what's actually used; retention periods agreed (12 months for unconverted enquiries, 6 years for purchases).
- [ ] Terms: offer validity, cancellation before collection, payment and ownership wording.
- [ ] Cookie policy matches the tags actually configured in GTM.

## 4. Imagery

- [ ] Current photos are licensed stock (Unsplash/Pexels licence; details in `src/content/photo-credits.json`). Nine are from Autotrader UK's Unsplash account; swap these first.
- [ ] Client asked for **Nissan, Ford and Toyota vans** and **Fiat, MG, VW** cars. We have Toyota, Fiat and Mercedes vans and Fiat, MG (ZS EV, not MG4) and VW cars. Book the shoot of GFV stock, or approve a stock budget, to fill the gaps.
- [ ] No legible customer number plates anywhere.

## 5. Accounts and integrations

- [ ] Google Ads account created **in the buying company's legal name**; advertiser verification started.
- [ ] GTM container created and `NEXT_PUBLIC_GTM_ID` set; GA4 and Google Ads tags configured per `docs/TRACKING.md`; one real test conversion recorded before ads go live.
- [ ] Search Console verified; `sitemap.xml` submitted.
- [ ] Meta Business verification done; WhatsApp number connected; templates in `docs/WHATSAPP_TEMPLATES.md` approved; webhook pointed at `/api/webhooks/whatsapp`.
- [ ] Postmark server and sender domain verified (DKIM + return-path). GFV's domain has no DMARC record today: publish `v=DMARC1; p=none; rua=…` and extend SPF.
- [ ] Turnstile site and secret keys set.
- [ ] Production `APP_SECRET`, `CRON_SECRET`, `WHATSAPP_VERIFY_TOKEN` generated (32+ random characters each).
- [ ] Team inboxes for new-lead alerts set in Admin › Settings.

## 6. Final QA (agency rules)

- [ ] `npm run typecheck && npm run lint && npm test`
- [ ] `npm run test:e2e` against the production preview (`E2E_BASE_URL=https://…`) — Chrome, Firefox, Safari, Pixel, iPhone.
- [ ] PageSpeed Insights mobile ≥ 80 on all three landing pages (median of 3 runs).
- [ ] Submit one real test lead on each landing page from a phone; check the admin, the seller email, the team alert and WhatsApp.
- [ ] Send, accept and decline a test offer.
- [ ] Spelling and grammar read-through of every page (British English).
- [ ] Compare against the approved design direction.
