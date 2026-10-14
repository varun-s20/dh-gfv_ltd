# Tracking: GTM, GA4 and Google Ads

## How consent works

`src/lib/analytics/consent-script.ts` runs first in `<head>` and sets Google Consent Mode v2 defaults to **denied** for `ad_storage`, `ad_user_data`, `ad_personalization` and `analytics_storage`, with `ads_data_redaction` and `url_passthrough` on.

The site uses **basic** consent mode: Google Tag Manager is not requested at all until the visitor accepts analytics or advertising cookies. Returning visitors who already accepted load GTM immediately. Switching to advanced mode (cookieless pings for modelling) is a one-word change, but get the client's agreement first; the ICO's position on cookieless pings is cautious.

## dataLayer events

| Event | When | Parameters |
|---|---|---|
| `quote_start` | Registration entered on any page | `location` (e.g. `sell-my-tesla-hero`), `vehicle_category` |
| `quote_step` | Each step of the form is shown | `step_name`, `step_number`, `vehicle_category` |
| `generate_lead` | Form submitted successfully | `lead_ref`, `vehicle_category`, `contact_preference`, `photo_count`, and `user_data.email` / `user_data.phone_number` (only with advertising consent, for enhanced conversions) |
| `whatsapp_click` | Any WhatsApp link (floating button, sticky bar, header menu, contact and FAQ pages) | `location`, `vehicle_category` (where known) |
| `phone_click` | Any `tel:` link | `location` (`header`, `footer` or the page path) |

## GTM setup

1. **Tags**
   - Google tag (GA4) with your Measurement ID, firing on *Initialization – All Pages*.
   - GA4 event tags for `quote_start`, `quote_step`, `generate_lead` and `whatsapp_click`, passing the parameters above as event parameters.
   - Google Ads Conversion Tracking tag, conversion label "Quote request", firing on the custom event `generate_lead`. Set **transaction ID** = `{{DLV - lead_ref}}` to de-duplicate, and enable **enhanced conversions** using the `user_data` variable.
   - Conversion Linker tag on all pages.
2. **Variables**: Data Layer Variables for each parameter above.
3. **Consent**: every Google tag uses built-in consent checks; no additional consent settings needed.

## Lead source on every lead

On the first page view the site stores `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, the landing page and the referrer (session storage). They're attached to the lead on submit and shown in the admin, along with a derived **channel** (`google-ads`, `organic`, `direct`, `referral`, `social`, `email`).

## Measuring cars bought, not just form fills

Smart Bidding gets much better when it learns which leads became purchases. Admin › Reports exports an **offline conversions CSV** (gclid, conversion name, time, value in GBP) for leads that reached Accepted or Closed. Upload it weekly in Google Ads › Goals › Conversions › Uploads, using a conversion action named to match Admin › Settings.

## UTM convention for the three campaigns

Use auto-tagging (gclid) plus a tracking template so the campaign name is readable in the admin:

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}
```

with custom parameter `{_campaign}` = `tesla-core`, `ev-core` or `van-core` at campaign level.
