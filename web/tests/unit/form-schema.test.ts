import { describe, expect, it } from "vitest";
import { quoteFormSchema, stepSchemas } from "@/lib/leads/form-schema";
import { formatPostcode, formatReg, isPlausibleReg, isUkPostcode, toE164Uk } from "@/lib/vehicles";

const valid = {
  category: "tesla",
  registration: "ab12 cde",
  make: "Tesla",
  model: "Model Y",
  modelOther: "",
  variant: "Long Range",
  year: "2022",
  mileage: "31,200",
  condition: "good",
  damage: "none",
  damageDetails: "",
  writeOff: "no",
  warningLights: "no",
  serviceHistory: "full",
  batteryHealth: "94",
  batteryHealthSource: "in-car",
  finance: "pcp",
  financeLender: "Tesla Financial Services",
  financeSettlement: "£12,500",
  isRegisteredKeeper: "yes",
  keys: "2",
  cables: ["type2"],
  intent: "sell",
  fsd: "bought",
  eap: null,
  batteryLeased: null,
  sellerType: "private",
  businessName: "",
  vatQualifying: null,
  vehicleCount: "",
  vanFeatures: [],
  photos: [],
  fullName: "Danny Pope",
  email: " Danny@Example.com ",
  phone: "07700 900123",
  postcode: "en118tl",
  contactPreference: "whatsapp",
  sellerNotes: "",
  marketingOptIn: false,
  website: "",
};

describe("quote form schema", () => {
  it("accepts a complete submission and normalises values", () => {
    const r = quoteFormSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.registration).toBe("AB12CDE");
    expect(r.data.mileage).toBe(31200);
    expect(r.data.year).toBe(2022);
    expect(r.data.financeSettlement).toBe(12500);
    expect(r.data.email).toBe("danny@example.com");
    expect(r.data.phone).toBe("+447700900123");
    expect(r.data.postcode).toBe("EN11 8TL");
    expect(r.data.eap).toBeUndefined();
    expect(r.data.batteryHealth).toBe(94);
  });

  it("requires damage details only when there is damage", () => {
    const step = stepSchemas.condition;
    expect(step.safeParse({ ...valid, damage: "minor", damageDetails: "" }).success).toBe(false);
    expect(step.safeParse({ ...valid, damage: "minor", damageDetails: "Scuff on rear bumper" }).success).toBe(true);
    expect(step.safeParse({ ...valid, damage: "none", damageDetails: "" }).success).toBe(true);
  });

  it("runs conditional rules on a step even when later steps are empty", () => {
    const r = stepSchemas.vehicle.safeParse({ ...valid, model: "Other", modelOther: "", fullName: "" });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => i.path[0])).toContain("modelOther");
  });

  it("asks for the lender on PCP/HP but not on lease", () => {
    expect(stepSchemas.ownership.safeParse({ ...valid, finance: "hp", financeLender: "" }).success).toBe(false);
    expect(stepSchemas.ownership.safeParse({ ...valid, finance: "lease", financeLender: "" }).success).toBe(true);
  });

  it("gives friendly messages for unanswered required choices", () => {
    const r = stepSchemas.condition.safeParse({ ...valid, condition: null });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0]?.message).toBe("Choose the overall condition");
  });

  it("rejects a filled honeypot", () => {
    expect(quoteFormSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });

  it("caps mileage and year to sensible bounds", () => {
    expect(stepSchemas.vehicle.safeParse({ ...valid, mileage: "999999" }).success).toBe(false);
    expect(stepSchemas.vehicle.safeParse({ ...valid, year: "1999" }).success).toBe(false);
  });
});

describe("UK formats", () => {
  it.each([
    ["AB12CDE", "AB12 CDE"],
    ["A123BCD", "A123 BCD"],
    ["ABC123D", "ABC 123D"],
    ["ABZ1234", "ABZ 1234"],
  ])("formats %s as %s", (input, out) => {
    expect(formatReg(input)).toBe(out);
    expect(isPlausibleReg(input)).toBe(true);
  });

  it("rejects implausible plates", () => {
    expect(isPlausibleReg("HELLO")).toBe(false);
    expect(isPlausibleReg("123456789")).toBe(false);
  });

  it("validates and formats postcodes", () => {
    expect(isUkPostcode("EN11 8TL")).toBe(true);
    expect(isUkPostcode("SW1A1AA")).toBe(true);
    expect(isUkPostcode("12345")).toBe(false);
    expect(formatPostcode("sw1a1aa")).toBe("SW1A 1AA");
  });

  it("normalises UK phone numbers to E.164", () => {
    expect(toE164Uk("07700 900123")).toBe("+447700900123");
    expect(toE164Uk("+44 20 3051 0406")).toBe("+442030510406");
    expect(toE164Uk("0044 7700 900123")).toBe("+447700900123");
    expect(toE164Uk("12345")).toBeNull();
  });
});
