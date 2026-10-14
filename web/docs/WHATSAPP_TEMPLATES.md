# WhatsApp message templates

Submit these in **Meta Business Manager › WhatsApp Manager › Message templates**. Both are **Utility** templates (they relate to a request the seller made), language **English (UK)** (`en_GB`). Approval usually takes minutes to 24 hours.

The platform sends them from Admin › Leads. Template names can be changed with `WHATSAPP_TEMPLATE_RECEIVED` and `WHATSAPP_TEMPLATE_OFFER`. Until Meta approves them, messages are recorded as "simulated" and nothing is sent.

## 1. `quote_received`

Sent automatically when a seller who prefers WhatsApp submits the form.

**Body**

> Hi {{1}}, thanks for sending us your {{2}}. Your reference is {{3}}. A specialist will reply here with your offer, usually {{4}}.

| Parameter | Example |
|---|---|
| {{1}} first name | Danny |
| {{2}} vehicle | Tesla Model Y |
| {{3}} reference | GF-7K3Q9 |
| {{4}} turnaround | the same working day |

## 2. `quote_offer`

Sent from the admin quote builder.

**Body**

> Hi {{1}}, your offer for the {{2}} ({{3}}) is {{4}}. It's valid until {{5}}. Tap below to view and accept it, or reply here with any questions.

**Button**: *Visit website*, type **dynamic URL**, text "View my offer", URL `https://YOUR-DOMAIN/offer/{{1}}` (example value: `AbCdEf123456GhIjKl789012`).

| Parameter | Example |
|---|---|
| {{1}} first name | Danny |
| {{2}} vehicle | Tesla Model Y |
| {{3}} registration | AB12 CDE |
| {{4}} amount | £24,850 |
| {{5}} valid until | Tuesday 20 October 2026 |

## Cost-saving tip

When a seller messages first (for example by tapping a WhatsApp button on the site), a 24-hour customer-service window opens. Replies inside that window are free, and utility templates sent inside it are also free. The WhatsApp buttons on the site pre-fill a message to encourage this.

## Webhook

- Callback URL: `https://YOUR-DOMAIN/api/webhooks/whatsapp`
- Verify token: the value of `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field. Delivery and read receipts update each message's status in the lead timeline.
