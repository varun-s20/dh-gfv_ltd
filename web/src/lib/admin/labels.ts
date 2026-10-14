/** Human labels for the answers sellers give on the quote form. Client-safe. */

const map = (m: Record<string, string>) => (value: string | null | undefined) => (value ? (m[value] ?? value) : null);

export const conditionLabel = map({ excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor" });
export const damageLabel = map({ none: "None", minor: "Minor", major: "Major" });
export const writeOffLabel = map({ no: "No", "cat-n": "Category N", "cat-s": "Category S", unsure: "Not sure" });
export const serviceLabel = map({ full: "Full history", part: "Part history", none: "No history", unsure: "Not sure" });
export const financeLabel = map({ none: "No finance", pcp: "PCP", hp: "HP", lease: "Lease", unsure: "Not sure" });
export const intentLabel = map({ sell: "Sell outright", "part-exchange": "Part-exchange", commission: "Sale on commission" });
export const sellerTypeLabel = map({ private: "Private seller", business: "Business" });
export const fsdLabel = map({ bought: "Bought outright", subscription: "Subscription", none: "Not fitted", unsure: "Not sure" });
export const eapLabel = map({ bought: "Bought outright", none: "Not fitted", unsure: "Not sure" });
export const batterySourceLabel = map({ "in-car": "In-car test", certificate: "Certificate", estimate: "Seller's estimate" });
export const cableLabel = map({ type2: "Type 2", granny: "Three-pin (granny)", chademo: "CHAdeMO", none: "None" });
export const vanFeatureLabel = map({ racking: "Racking", livery: "Livery", "tow-bar": "Tow bar", conversion: "Conversion" });

export const yesNo = (value: boolean | null | undefined, yes = "Yes", no = "No") => (value === true ? yes : value === false ? no : null);

const TEMPLATES: Record<string, string> = {
  "lead-received": "Confirmation email",
  quote_received: "WhatsApp confirmation",
  "admin-new-lead": "Team alert: new lead",
  "quote-offer": "Offer email",
  quote_offer: "Offer on WhatsApp",
  "offer-accepted": "Acceptance email",
  "admin-offer-response": "Team alert: offer response",
};
export const templateLabel = (template: string) => TEMPLATES[template] ?? template;
