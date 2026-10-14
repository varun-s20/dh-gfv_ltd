# Google Ads launch plan

Three Search campaigns, one per landing page, plus a small brand campaign. Built from the research pack (keyword research, competitor ads, trade-mark rules). Import files are in `docs/google-ads/`.

> **Estimates.** Search volumes and CPCs below are modelled from public benchmarks, not Keyword Planner. Pull real figures from the client's account in week 1 and adjust budgets before unpausing.

## Account structure

| Campaign | Landing page | Daily budget (launch) | Ad groups |
|---|---|---|---|
| GF \| Search \| Tesla | `/sell-my-tesla` | £24 | Sell My Tesla, Tesla Buyers, Tesla Valuation, Model 3, Model Y, Model S & X, Finance/PCP |
| GF \| Search \| All EV | `/sell-my-electric-car` | £20 | Sell My Electric Car, EV Buyers, EV Valuation, Nissan Leaf, MG, VW Group, Kia & Hyundai, City EVs & leased batteries |
| GF \| Search \| EV Vans | `/sell-my-electric-van` | £8 | Sell My Electric Van, Valuation, Ford E-Transit, Nissan e-NV200/Townstar, Toyota & Stellantis, Mercedes/VW/Renault/Maxus, Fleet disposal |
| GF \| Search \| Brand | `/` | £3 | Brand |

**Recommended launch budget: about £55/day (≈ £1,670/month); minimum about £35/day.** Ad spend is paid by the client directly to Google and is outside the build fee. Review after 30 days; scale to £100–£150/day only once cost per lead and lead-to-purchase rate are proven.

Rough unit economics to sanity-check with Danny: blended CPC ≈ £1.70, form conversion 6–10% → cost per lead ≈ £17–£28 → starting target CPA £25. Ceiling test: *gross profit per vehicle × lead-to-purchase rate × share of profit for marketing* (e.g. £1,500 × 7% × 35% ≈ £37).

## Settings for every campaign

- Search Network only. Search partners **off**, Display expansion **off**, broad match **off**, auto-applied recommendations **off**.
- Location: United Kingdom, **Presence** only. Exclude areas the client doesn't collect from.
- Ad schedule: all hours (leads arrive overnight); call assets only during opening hours.
- Bidding: **Manual CPC** for weeks 1–4 (core £1.50–£2.50, valuation £1.00–£1.60, vans £1.20–£2.00). Switch to Maximise Conversions at 15–20 conversions in 30 days, then Target CPA at the observed CPA.
- Tracking template (campaign level): `{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}` with custom parameter `_campaign` = `tesla-core`, `ev-core`, `van-core` or `brand`.
- Advertiser verification in the buying company's legal name (Green Future Vehicles Limited).

## Assets

- **Sitelinks**: Sell my Tesla, Sell my electric car, Sell my electric van, How it works, Questions.
- **Callouts** (only those the client confirms): No fees, Free collection, Paid before collection, Finance settled, Priced by a specialist, Battery health valued.
- **Structured snippets**: Models: Model 3, Model Y, Model S, Model X · Brands: MG, Volkswagen, Nissan, Kia, Hyundai, Polestar · Types: Panel van, Crew van, Combi.
- **Call asset** with the business number, scheduled to opening hours; **business name and logo**; **image assets** from the site's photography.

## Trade-mark rules for "Tesla"

- Bidding on *sell my tesla*, *tesla model 3 valuation* etc. as **keywords** is allowed.
- In **ad text**, use Tesla only descriptively ("Sell Your Tesla", "We Buy Used Teslas"). Never imply a partnership, never use Tesla logos, and keep "Independent buyer" copy available. If Tesla files a complaint, ads using the mark in text may be restricted; keep a non-trade-mark RSA in each Tesla ad group as a fallback.
- Never use "We Buy Any…" in ads or bid on competitor brand terms at launch.

## Conversions

Configure per `docs/TRACKING.md`:

| Conversion | Type | Use |
|---|---|---|
| Quote request (`generate_lead`) | Website, GTM, enhanced conversions on | **Primary** |
| Registration entered (`quote_start`) | Website | Secondary (observation) |
| WhatsApp click, call from ads ≥ 60 s | Website / call | Secondary |
| Offer accepted / Vehicle purchased | Offline import (Admin › Reports CSV) | Primary once ≥ 15/month, with values |

Don't unpause anything until one real test lead has been recorded as a conversion.

## Importing with Google Ads Editor

1. Replace `https://www.greenfuturevehicles.com` in the CSVs with the live domain.
2. In Google Ads Editor: **Account › Import › From file**, in this order: `campaigns.csv`, `keywords.csv` (creates ad groups), `responsive-search-ads.csv`, `negative-keywords.csv` (the "Account (shared list)" rows go into a shared negative list attached to all four campaigns).
3. Review, then **Post**. Everything imports **paused**.

## Phase 2 and later (not in the import)

Premium EVs, PCO/private-hire drivers, a generic `[sell my van]` test, competitor conquest and Microsoft Ads are documented in the research pack. Add them once the core campaigns have a stable CPA.
