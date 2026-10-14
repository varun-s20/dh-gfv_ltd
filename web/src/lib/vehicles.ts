/**
 * Electric makes and models sold in the UK, grouped for the quote form pickers.
 * Expandable: add a model here and it appears in the form, the admin filters and
 * the SEO make list. "Other" is always offered so no seller is turned away.
 */
export type Category = "tesla" | "ev" | "van";

export type MakeEntry = { make: string; models: string[] };

export const TESLA_MODELS = ["Model 3", "Model Y", "Model S", "Model X", "Roadster"] as const;

export const CAR_MAKES: MakeEntry[] = [
  { make: "Tesla", models: [...TESLA_MODELS] },
  { make: "Abarth", models: ["500e", "600e"] },
  { make: "Audi", models: ["Q4 e-tron", "Q4 Sportback e-tron", "Q6 e-tron", "Q8 e-tron", "e-tron", "e-tron GT", "A6 e-tron"] },
  { make: "BMW", models: ["i3", "i4", "i5", "i7", "iX", "iX1", "iX2", "iX3"] },
  { make: "BYD", models: ["Atto 2", "Atto 3", "Dolphin", "Dolphin Surf", "Seal", "Seal U", "Sealion 7"] },
  { make: "Citroën", models: ["ë-C3", "ë-C4", "ë-C4 X", "Ami"] },
  { make: "Cupra", models: ["Born", "Tavascan"] },
  { make: "DS", models: ["DS 3 E-Tense"] },
  { make: "Fiat", models: ["500e", "600e", "Grande Panda"] },
  { make: "Ford", models: ["Mustang Mach-E", "Explorer", "Capri", "Puma Gen-E"] },
  { make: "Genesis", models: ["GV60", "GV70 Electrified", "G80 Electrified"] },
  { make: "Honda", models: ["e", "e:Ny1"] },
  { make: "Hyundai", models: ["Ioniq 5", "Ioniq 5 N", "Ioniq 6", "Ioniq Electric", "Kona Electric", "Inster"] },
  { make: "Jaguar", models: ["I-Pace"] },
  { make: "Kia", models: ["EV3", "EV6", "EV9", "Niro EV", "e-Niro", "Soul EV"] },
  { make: "Lexus", models: ["UX 300e", "RZ"] },
  { make: "Lotus", models: ["Eletre", "Emeya"] },
  { make: "Mazda", models: ["MX-30", "6e"] },
  { make: "Mercedes-Benz", models: ["EQA", "EQB", "EQC", "EQE", "EQE SUV", "EQS", "EQS SUV", "CLA", "G 580"] },
  { make: "MG", models: ["MG4", "MG4 XPower", "MG5", "ZS EV", "MGS5", "Cyberster"] },
  { make: "MINI", models: ["Cooper E / SE", "Electric (2020-2023)", "Aceman", "Countryman E / SE"] },
  { make: "Nissan", models: ["Leaf", "Ariya", "Micra"] },
  { make: "Peugeot", models: ["e-208", "e-2008", "e-308", "e-3008", "e-5008"] },
  { make: "Polestar", models: ["2", "3", "4"] },
  { make: "Porsche", models: ["Taycan", "Taycan Cross Turismo", "Taycan Sport Turismo", "Macan Electric"] },
  { make: "Renault", models: ["Zoe", "Megane E-Tech", "Scenic E-Tech", "5 E-Tech", "4 E-Tech", "Twizy"] },
  { make: "Skoda", models: ["Enyaq", "Enyaq Coupe", "Elroq"] },
  { make: "Smart", models: ["#1", "#3", "EQ fortwo", "EQ forfour"] },
  { make: "Toyota", models: ["bZ4X", "Urban Cruiser"] },
  { make: "Vauxhall", models: ["Corsa Electric", "Mokka Electric", "Astra Electric", "Frontera Electric", "Grandland Electric"] },
  { make: "Volkswagen", models: ["ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz", "e-Golf", "e-up!"] },
  { make: "Volvo", models: ["EX30", "EX40 / XC40 Recharge", "EC40 / C40 Recharge", "EX90"] },
];

export const VAN_MAKES: MakeEntry[] = [
  { make: "Ford", models: ["E-Transit", "E-Transit Custom", "E-Transit Courier", "E-Tourneo Custom"] },
  { make: "Nissan", models: ["e-NV200", "Townstar EV", "Interstar-e"] },
  { make: "Toyota", models: ["Proace Electric", "Proace City Electric", "Proace Max Electric"] },
  { make: "Volkswagen", models: ["ID. Buzz Cargo", "e-Crafter", "e-Transporter", "e-Caddy"] },
  { make: "Vauxhall", models: ["Vivaro Electric", "Combo Electric", "Movano Electric"] },
  { make: "Peugeot", models: ["e-Expert", "e-Partner", "e-Boxer"] },
  { make: "Citroën", models: ["ë-Dispatch", "ë-Berlingo", "ë-Relay"] },
  { make: "Fiat", models: ["E-Scudo", "E-Doblo", "E-Ducato"] },
  { make: "Mercedes-Benz", models: ["eVito", "eSprinter", "eCitan"] },
  { make: "Renault", models: ["Kangoo E-Tech", "Trafic E-Tech", "Master E-Tech"] },
  { make: "Maxus", models: ["eDeliver 3", "eDeliver 5", "eDeliver 7", "eDeliver 9", "e Deliver 9 Chassis"] },
  { make: "LEVC", models: ["VN5", "TX"] },
  { make: "Kia", models: ["PV5"] },
  { make: "Farizon", models: ["SV"] },
];

export const OTHER = "Other";

export function makesFor(category: Category): MakeEntry[] {
  if (category === "van") return VAN_MAKES;
  if (category === "tesla") return CAR_MAKES.filter((m) => m.make === "Tesla");
  return CAR_MAKES.filter((m) => m.make !== "Tesla");
}

export function modelsFor(category: Category, make: string): string[] {
  return makesFor(category).find((m) => m.make === make)?.models ?? [];
}

export const FIRST_EV_YEAR = 2008;
export const currentYear = () => new Date().getFullYear();
export const yearOptions = () => {
  const years: number[] = [];
  for (let y = currentYear() + 1; y >= FIRST_EV_YEAR; y--) years.push(y);
  return years;
};

/* ---------- registration + postcode helpers (shared by client and server) ---------- */

/** Uppercase with spaces removed: "ab12 cde" → "AB12CDE". */
export const normaliseReg = (reg: string) => reg.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Accepts GB current/prefix/suffix/dateless and Northern Ireland formats.
 * We validate loosely on purpose: a buyer would rather see an odd plate than lose a lead.
 */
export function isPlausibleReg(reg: string) {
  const r = normaliseReg(reg);
  return r.length >= 2 && r.length <= 8 && /[A-Z]/.test(r) && /\d/.test(r);
}

/** Display a registration the way it appears on the plate. */
export function formatReg(reg: string) {
  const r = normaliseReg(reg);
  if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(r)) return `${r.slice(0, 4)} ${r.slice(4)}`; // AB12 CDE
  if (/^[A-Z]\d{1,3}[A-Z]{3}$/.test(r)) return `${r.slice(0, -3)} ${r.slice(-3)}`; // A123 BCD
  if (/^[A-Z]{3}\d{1,3}[A-Z]$/.test(r)) return `${r.slice(0, 3)} ${r.slice(3)}`; // ABC 123D
  if (/^[A-Z]{1,3}\d{1,4}$/.test(r)) return r.replace(/^([A-Z]{1,3})(\d+)$/, "$1 $2");
  return r;
}

const POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|[A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export const isUkPostcode = (value: string) => POSTCODE.test(value.trim());

export function formatPostcode(value: string) {
  const v = value.toUpperCase().replace(/\s+/g, "");
  return v.length > 3 ? `${v.slice(0, -3)} ${v.slice(-3)}` : v;
}

/** UK numbers to E.164 (+44…); returns null when it isn't a plausible UK number. */
export function toE164Uk(phone: string): string | null {
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0044")) d = d.slice(2);
  if (d.startsWith("44")) d = `0${d.slice(2)}`;
  if (!/^0\d{9,10}$/.test(d)) return null;
  return `+44${d.slice(1)}`;
}

export const categoryLabel: Record<Category, string> = {
  tesla: "Tesla",
  ev: "Electric car",
  van: "Electric van",
};
