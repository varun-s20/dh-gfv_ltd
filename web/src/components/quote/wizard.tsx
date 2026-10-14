"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { submitQuote } from "@/app/quote/actions";
import { CtaButton, Plate } from "@/components/ui/primitives";
import { heroCar } from "@/content/cars";
import { fleet } from "@/content/fleet";
import { readAttribution, readConsent, track } from "@/lib/analytics/client";
import { STEPS, STEP_FIELDS, quoteFormSchema, stepSchemas, type QuoteFormInput, type StepId } from "@/lib/leads/form-schema";
import { site, whatsappLink } from "@/lib/site";
import { OTHER, categoryLabel, isPlausibleReg, makesFor, modelsFor, normaliseReg, yearOptions, type Category } from "@/lib/vehicles";
import { ChoiceGroup, Field, SelectInput, TextArea, TextInput } from "./fields";
import { PhotoUploader, type UploadedPhoto } from "./photo-uploader";
import { Turnstile } from "./turnstile";

const DRAFT_KEY = "gf_quote_draft_v1";

/* true only once React has hydrated in the browser (false during SSR and the first client pass). */
const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);
const DRAFT_MAX_AGE = 1000 * 60 * 60 * 24 * 14;

type Values = QuoteFormInput & { photos: UploadedPhoto[] };

function defaults(reg?: string, category?: Category): Values {
  return {
    category: category as Values["category"],
    registration: reg ? normaliseReg(reg) : "",
    make: category === "tesla" ? "Tesla" : "",
    model: "",
    modelOther: "",
    variant: "",
    year: "",
    mileage: "",
    condition: undefined as unknown as Values["condition"],
    damage: "none",
    damageDetails: "",
    writeOff: "no",
    warningLights: "no",
    serviceHistory: undefined as unknown as Values["serviceHistory"],
    batteryHealth: "",
    batteryHealthSource: undefined,
    finance: undefined as unknown as Values["finance"],
    financeLender: "",
    financeSettlement: "",
    isRegisteredKeeper: "yes",
    keys: undefined as unknown as Values["keys"],
    cables: [],
    intent: "sell",
    fsd: undefined,
    eap: undefined,
    batteryLeased: undefined,
    sellerType: "private",
    businessName: "",
    vatQualifying: undefined,
    vehicleCount: "",
    vanFeatures: [],
    photos: [],
    fullName: "",
    email: "",
    phone: "",
    postcode: "",
    contactPreference: "whatsapp",
    sellerNotes: "",
    marketingOptIn: false,
    website: "",
  };
}

export function QuoteWizard({ initialReg, initialCategory }: { initialReg?: string; initialCategory?: Category }) {
  const router = useRouter();
  const form = useForm<Values>({ defaultValues: defaults(initialReg, initialCategory), shouldFocusError: true });
  const { register, getValues, setError, clearErrors, setValue, reset, setFocus, control, formState } = form;
  const errors = formState.errors;

  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  // The step we last scrolled for, so a remount (or the first render) never jumps the page.
  const shownStep = useRef(0);
  // Input typed before hydration would be lost, so the form only accepts input once it's live.
  const hydrated = useHydrated();

  const category = useWatch({ control, name: "category" }) as Category | undefined;
  const make = useWatch({ control, name: "make" });
  const model = useWatch({ control, name: "model" });
  const damage = useWatch({ control, name: "damage" });
  const finance = useWatch({ control, name: "finance" });
  const sellerType = useWatch({ control, name: "sellerType" });
  const batteryHealth = useWatch({ control, name: "batteryHealth" });
  const registration = useWatch({ control, name: "registration" });
  const year = useWatch({ control, name: "year" });
  const mileage = useWatch({ control, name: "mileage" });
  const photos = useWatch({ control, name: "photos" }) as UploadedPhoto[];

  const stepId: StepId = STEPS[step]!.id;

  /* ---------- draft restore + autosave (this device only) ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { values: Values; step: number; savedAt: number };
      const fresh = Date.now() - draft.savedAt < DRAFT_MAX_AGE;
      const sameCar = !initialReg || normaliseReg(draft.values.registration ?? "") === normaliseReg(initialReg);
      if (fresh && sameCar && draft.values) {
        reset({ ...defaults(initialReg, initialCategory), ...draft.values });
        // One-off sync from browser storage after hydration; the server can't know the draft.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep(Math.min(Math.max(0, draft.step), STEPS.length - 1));
        setRestored(true);
      }
    } catch {
      // Ignore unreadable drafts.
    }
  }, [initialReg, initialCategory, reset]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ values: { ...values, website: "" }, step, savedAt: Date.now() }));
        } catch {}
      }, 400);
      },
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [form, step]);

  /* ---------- step history: the browser Back button moves back a step ---------- */
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { gfStep?: number } | null)?.gfStep;
      if (typeof s === "number") setStep((current) => Math.min(s, current));
    };
    window.history.replaceState({ ...window.history.state, gfStep: step }, "");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // Only on mount; later steps push their own entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    const top = (topRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    track("quote_step", { step_name: stepId, step_number: step + 1, vehicle_category: category ?? "unknown" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- validation ---------- */
  const focusField = useCallback(
    (name: string) => {
      requestAnimationFrame(() => {
        const el =
          document.querySelector<HTMLElement>(`[name="${name}"]:not([type=hidden])`) ??
          document.querySelector<HTMLElement>(`[data-field="${name}"] input`);
        if (el) {
          el.focus({ preventScroll: true });
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        } else {
          try {
            setFocus(name as FieldPath<Values>);
          } catch {}
        }
      });
    },
    [setFocus],
  );

  const validateStep = useCallback(
    (id: StepId) => {
      const fields = STEP_FIELDS[id];
      clearErrors(fields as FieldPath<Values>[]);
      const result = stepSchemas[id].safeParse(getValues());
      if (result.success) return true;
      let first: string | undefined;
      const seen = new Set<string>();
      for (const issue of result.error.issues) {
        const name = String(issue.path[0] ?? "");
        // The first problem with a field is the one worth showing.
        if (!name || seen.has(name)) continue;
        seen.add(name);
        first ??= name;
        setError(name as FieldPath<Values>, { type: "manual", message: issue.message });
      }
      if (first) focusField(first);
      return false;
    },
    [clearErrors, getValues, setError, focusField],
  );

  const goTo = (index: number) => {
    setStep(index);
    window.history.pushState({ ...window.history.state, gfStep: index }, "");
  };

  const next = () => {
    if (!validateStep(stepId)) return;
    if (step < STEPS.length - 1) goTo(step + 1);
  };

  const back = () => {
    if (step === 0) return;
    window.history.back();
  };

  /* ---------- submit ---------- */
  const onSubmit = () => {
    setServerError(null);
    if (!validateStep("contact")) return;
    const values = getValues();
    const full = quoteFormSchema.safeParse({ ...values, attribution: readAttribution() ?? undefined, turnstileToken });
    if (!full.success) {
      const issue = full.error.issues[0];
      const name = String(issue?.path[0] ?? "");
      const owner = STEPS.findIndex((s) => STEP_FIELDS[s.id].includes(name as never));
      if (owner > -1) {
        setStep(owner);
        setTimeout(() => {
          setError(name as FieldPath<Values>, { type: "manual", message: issue!.message });
          focusField(name);
        }, 50);
      }
      return;
    }
    startSubmit(async () => {
      const result = await submitQuote({ ...values, attribution: readAttribution() ?? undefined, turnstileToken });
      if (!result.ok) {
        setServerError(result.message);
        if (result.fieldErrors) {
          const entries = Object.entries(result.fieldErrors);
          const owner = STEPS.findIndex((s) => entries.some(([k]) => STEP_FIELDS[s.id].includes(k as never)));
          if (owner > -1 && owner !== step) setStep(owner);
          setTimeout(() => {
            for (const [k, m] of entries) setError(k as FieldPath<Values>, { type: "server", message: m });
            if (entries[0]) focusField(entries[0][0]);
          }, 50);
        }
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      const consent = readConsent();
      track("generate_lead", {
        lead_ref: result.ref,
        vehicle_category: result.category,
        contact_preference: result.contactPreference,
        photo_count: values.photos.length,
        // Enhanced conversions only with advertising consent; Google hashes these.
        ...(consent?.marketing ? { user_data: { email: values.email, phone_number: values.phone } } : {}),
      });
      router.push(`/quote/received?ref=${encodeURIComponent(result.ref)}&via=${result.contactPreference}`);
    });
  };

  /* ---------- derived ---------- */
  const makes = useMemo(() => (category ? makesFor(category) : []), [category]);
  const models = useMemo(() => (category && make ? modelsFor(category, make) : []), [category, make]);
  const vehicleTitle = [year, make, model === OTHER ? getValues("modelOther") : model].filter(Boolean).join(" ");
  const isTesla = category === "tesla" || make === "Tesla";
  const isRenault = /renault/i.test(make ?? "");
  const isVan = category === "van";
  const e = errors as Record<string, { message?: string } | undefined>;

  const reg = register("registration", {
    setValueAs: (v: string) => (typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 8) : v),
    onChange: () => e.registration && clearErrors("registration"),
  });

  const clearOnChange = (name: FieldPath<Values>) => ({ onChange: () => e[name] && clearErrors(name) });

  const stepTitle: Record<StepId, { title: string; sub: string }> = {
    vehicle: { title: "Your vehicle", sub: "The basics. Your registration and the exact model help us price it properly." },
    condition: { title: "Condition and battery", sub: "Be honest and the offer stays firm. A healthy battery is worth more, so add its health if you can." },
    ownership: { title: "Ownership and extras", sub: "Finance, keys, cables and anything that adds value." },
    photos: { title: "Photos", sub: "Photos are how we give you a firm number. Five quick shots on your phone are enough, or skip and send them later." },
    contact: { title: "Where to send your offer", sub: "We'll reply with one firm offer, the way you choose." },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8 xl:gap-12">
      <StagePanel
        registration={registration}
        vehicleTitle={vehicleTitle}
        mileage={mileage}
        batteryHealth={batteryHealth}
        category={category}
        make={make}
        model={model}
        photos={photos.length}
        step={step}
        onJump={(i) => i < step && goTo(i)}
      />
      <div ref={topRef} className="min-w-0 scroll-mt-28">
        <Progress step={step} onJump={(i) => i < step && goTo(i)} />

        {restored ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ion/10 px-4 py-3 text-[0.92rem] text-chalk ring-1 ring-ion/25">
            <span className="flex items-center gap-2.5">
              <span className="ion-dot" />
              We kept your answers from last time on this device.
            </span>
            <button
              type="button"
              className="label text-chalk underline underline-offset-4"
              onClick={() => {
                try {
                  localStorage.removeItem(DRAFT_KEY);
                } catch {}
                reset(defaults(initialReg, initialCategory));
                setRestored(false);
                setStep(0);
              }}
            >
              Start again
            </button>
          </div>
        ) : null}

        <form
          inert={!hydrated}
          aria-busy={!hydrated || undefined}
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            if (stepId === "contact") onSubmit();
            else next();
          }}
          className="mt-5"
        >
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" {...register("website")} />
            </label>
          </div>

          <div className="on-pearl rounded-[2rem] bg-pearl-50 p-5 shadow-[0_2rem_4rem_-2rem_rgb(0_0_0/0.8)] sm:p-9 lg:p-11">
            <p className="label flex items-center gap-2.5 text-carbon-3 tabular-nums">
              <span className="ion-dot" />
              <span>{`Step ${step + 1} of ${STEPS.length}`}</span>
              <span aria-hidden className="text-carbon/25">
                ·
              </span>
              <span>{STEPS[step]!.short}</span>
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="display mt-4 text-[clamp(1.9rem,1.4rem+1.6vw,2.9rem)] leading-[1.02] outline-none">
              {stepTitle[stepId].title}
            </h2>
            <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-carbon-2">{stepTitle[stepId].sub}</p>

            <div className="mt-9 border-t border-carbon/[0.08] pt-8">
              {/* ------------------------------------------------ step 1: vehicle */}
              <div hidden={stepId !== "vehicle"} className="space-y-7">
                {!initialCategory ? (
                  <ChoiceGroup
                    legend="What are you selling?"
                    name="category"
                    columns={3}
                    error={e.category}
                    registration={register("category", {
                      onChange: (ev) => {
                        clearErrors("category");
                        setValue("make", ev.target.value === "tesla" ? "Tesla" : "");
                        setValue("model", "");
                      },
                    })}
                    options={[
                      { value: "tesla", label: "Tesla" },
                      { value: "ev", label: "Electric car" },
                      { value: "van", label: "Electric van" },
                    ]}
                  />
                ) : null}

                <Field label="Registration" htmlFor="registration" error={e.registration} hint="As it appears on the number plate.">
                  {({ describedBy, invalid }) => (
                    <div
                      className={clsx(
                        "flex h-16 max-w-sm items-stretch overflow-hidden rounded-2xl bg-[#f6f5f1] ring-1 transition-shadow focus-within:ring-2",
                        invalid ? "ring-2 ring-alert-deep" : "ring-carbon/25 focus-within:ring-ion-deep",
                      )}
                    >
                      <span aria-hidden className="flex w-11 flex-none flex-col items-center justify-end bg-[#1f3d8f] pb-1.5 font-display text-[0.65rem] font-bold text-white">
                        UK
                      </span>
                      <input
                        id="registration"
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="AB12 CDE"
                        className="w-0 min-w-0 flex-1 bg-transparent px-4 font-display text-[1.9rem] font-bold tracking-[0.08em] text-black uppercase placeholder:text-black/25 focus:outline-none wd-62"
                        {...reg}
                      />
                    </div>
                  )}
                </Field>

                {category === "tesla" ? (
                  <ChoiceGroup
                    legend="Which model?"
                    name="model"
                    columns={3}
                    error={e.model}
                    registration={register("model", clearOnChange("model"))}
                    options={modelsFor("tesla", "Tesla").map((m) => ({ value: m, label: m }))}
                  />
                ) : category ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Make" htmlFor="make" error={e.make}>
                      {({ describedBy, invalid }) => (
                        <SelectInput
                          id="make"
                          invalid={invalid}
                          aria-describedby={describedBy}
                          {...register("make", {
                            onChange: () => {
                              clearErrors("make");
                              setValue("model", "");
                            },
                          })}
                        >
                          <option value="">Choose make</option>
                          {makes.map((m) => (
                            <option key={m.make} value={m.make}>
                              {m.make}
                            </option>
                          ))}
                          <option value={OTHER}>Other</option>
                        </SelectInput>
                      )}
                    </Field>
                    <Field label="Model" htmlFor="model" error={e.model}>
                      {({ describedBy, invalid }) => (
                        <SelectInput id="model" invalid={invalid} aria-describedby={describedBy} disabled={!make} {...register("model", clearOnChange("model"))}>
                          <option value="">{make ? "Choose model" : "Choose the make first"}</option>
                          {models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                          <option value={OTHER}>Other</option>
                        </SelectInput>
                      )}
                    </Field>
                  </div>
                ) : null}

                {model === OTHER || make === OTHER ? (
                  <Field label={make === OTHER ? "Make and model" : "Model"} htmlFor="modelOther" error={e.modelOther}>
                    {({ describedBy, invalid }) => <TextInput id="modelOther" invalid={invalid} aria-describedby={describedBy} placeholder="e.g. Ora Funky Cat" {...register("modelOther", clearOnChange("modelOther"))} />}
                  </Field>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Year" htmlFor="year" error={e.year}>
                    {({ describedBy, invalid }) => (
                      <SelectInput id="year" invalid={invalid} aria-describedby={describedBy} {...register("year", clearOnChange("year"))}>
                        <option value="">Choose year</option>
                        {yearOptions().map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </SelectInput>
                    )}
                  </Field>
                  <Field label="Mileage" htmlFor="mileage" error={e.mileage}>
                    {({ describedBy, invalid }) => (
                      <TextInput id="mileage" invalid={invalid} aria-describedby={describedBy} inputMode="numeric" placeholder="31,200" suffix="mi" {...register("mileage", clearOnChange("mileage"))} />
                    )}
                  </Field>
                </div>

                <Field label="Version or trim" htmlFor="variant" optional hint={isTesla ? "For example Long Range AWD, Performance or Plaid." : "For example Long Range, Trophy or 77 kWh."}>
                  {({ describedBy }) => <TextInput id="variant" aria-describedby={describedBy} {...register("variant")} />}
                </Field>
              </div>

              {/* ------------------------------------------------ step 2: condition */}
              <div hidden={stepId !== "condition"} className="space-y-7">
                <ChoiceGroup
                  legend="Overall condition"
                  name="condition"
                  error={e.condition}
                  registration={register("condition", clearOnChange("condition"))}
                  options={[
                    { value: "excellent", label: "Excellent", hint: "Like new. No marks you'd point out." },
                    { value: "good", label: "Good", hint: "Normal wear: light scuffs or stone chips." },
                    { value: "fair", label: "Fair", hint: "Visible marks, kerbed wheels or worn interior." },
                    { value: "poor", label: "Needs work", hint: "Damage, faults or it doesn't drive." },
                  ]}
                />
                <ChoiceGroup
                  legend="Any damage?"
                  name="damage"
                  columns={3}
                  error={e.damage}
                  registration={register("damage", clearOnChange("damage"))}
                  options={[
                    { value: "none", label: "None" },
                    { value: "minor", label: "Minor" },
                    { value: "major", label: "Major" },
                  ]}
                />
                {damage && damage !== "none" ? (
                  <Field label="Tell us about the damage" htmlFor="damageDetails" error={e.damageDetails} hint="Where it is and roughly how big. Photos on the next steps help most.">
                    {({ describedBy, invalid }) => <TextArea id="damageDetails" invalid={invalid} aria-describedby={describedBy} {...register("damageDetails", clearOnChange("damageDetails"))} />}
                  </Field>
                ) : null}
                <div className="grid gap-7 sm:grid-cols-2">
                  <ChoiceGroup
                    legend="Ever been written off?"
                    name="writeOff"
                    error={e.writeOff}
                    registration={register("writeOff", clearOnChange("writeOff"))}
                    options={[
                      { value: "no", label: "No" },
                      { value: "cat-n", label: "Cat N" },
                      { value: "cat-s", label: "Cat S" },
                      { value: "unsure", label: "Not sure" },
                    ]}
                  />
                  <ChoiceGroup
                    legend="Any warning lights on?"
                    name="warningLights"
                    error={e.warningLights}
                    registration={register("warningLights", clearOnChange("warningLights"))}
                    options={[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                    ]}
                  />
                </div>
                <ChoiceGroup
                  legend="Service history"
                  name="serviceHistory"
                  columns={4}
                  error={e.serviceHistory}
                  hint={isTesla ? "Teslas don't have fixed service intervals. Tell us what's in the app's service record." : undefined}
                  registration={register("serviceHistory", clearOnChange("serviceHistory"))}
                  options={[
                    { value: "full", label: "Full" },
                    { value: "part", label: "Part" },
                    { value: "none", label: "None" },
                    { value: "unsure", label: "Not sure" },
                  ]}
                />

                <div className="overflow-hidden rounded-2xl bg-night-900 p-5 text-chalk sm:p-6">
                  <p className="label flex items-center gap-2.5 text-ion">
                    <span className="ion-dot" /> Battery health
                  </p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-[13rem_1fr] sm:items-start">
                    <div className="[&_label_span]:text-chalk [&_p]:text-chalk-3">
                      <Field
                        label="State of health"
                        htmlFor="batteryHealth"
                        optional
                        error={e.batteryHealth}
                        hint={isTesla ? "Service menu › Battery health test." : "Often in the battery or service menu."}
                      >
                        {({ describedBy, invalid }) => (
                          <TextInput id="batteryHealth" invalid={invalid} aria-describedby={describedBy} inputMode="numeric" placeholder="94" suffix="%" {...register("batteryHealth", clearOnChange("batteryHealth"))} />
                        )}
                      </Field>
                    </div>
                    {batteryHealth ? (
                      <div className="[&_legend]:text-chalk">
                        <ChoiceGroup
                          legend="Where is that figure from?"
                          name="batteryHealthSource"
                          columns={3}
                          error={e.batteryHealthSource}
                          registration={register("batteryHealthSource", clearOnChange("batteryHealthSource"))}
                          options={[
                            { value: "in-car", label: "The car" },
                            { value: "certificate", label: "A test" },
                            { value: "estimate", label: "My estimate" },
                          ]}
                        />
                      </div>
                    ) : (
                      <p className="text-[0.9rem] leading-relaxed text-chalk-2 sm:pt-8">
                        Don&apos;t know it? No problem. We&apos;ll work from range, mileage and age. A healthy battery is worth more, so it&apos;s worth checking.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------ step 3: ownership */}
              <div hidden={stepId !== "ownership"} className="space-y-7">
                <ChoiceGroup
                  legend="Is there finance on it?"
                  name="finance"
                  columns={3}
                  error={e.finance}
                  registration={register("finance", clearOnChange("finance"))}
                  options={[
                    { value: "none", label: "No" },
                    { value: "pcp", label: "PCP" },
                    { value: "hp", label: "HP" },
                    { value: "lease", label: "Lease" },
                    { value: "unsure", label: "Not sure" },
                  ]}
                />
                {finance === "pcp" || finance === "hp" ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Finance company" htmlFor="financeLender" error={e.financeLender}>
                      {({ describedBy, invalid }) => <TextInput id="financeLender" invalid={invalid} aria-describedby={describedBy} placeholder="e.g. Tesla Financial Services" {...register("financeLender", clearOnChange("financeLender"))} />}
                    </Field>
                    <Field label="Rough settlement figure" htmlFor="financeSettlement" optional error={e.financeSettlement} hint="We'll get the exact figure.">
                      {({ describedBy, invalid }) => (
                        <TextInput id="financeSettlement" invalid={invalid} aria-describedby={describedBy} inputMode="numeric" placeholder="12,500" suffix="£" {...register("financeSettlement", clearOnChange("financeSettlement"))} />
                      )}
                    </Field>
                  </div>
                ) : finance === "lease" ? (
                  <p className="rounded-2xl bg-ion/15 px-4 py-3 text-[0.92rem] leading-relaxed text-carbon ring-1 ring-ion-deep/20">
                    On a lease the vehicle usually belongs to the leasing company. Carry on and we&apos;ll tell you honestly what&apos;s possible.
                  </p>
                ) : null}
                <div className="grid gap-7 sm:grid-cols-2">
                  <ChoiceGroup
                    legend="Is the V5C logbook in your name?"
                    name="isRegisteredKeeper"
                    error={e.isRegisteredKeeper}
                    registration={register("isRegisteredKeeper", clearOnChange("isRegisteredKeeper"))}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                  />
                  <ChoiceGroup
                    legend={isTesla ? "Key cards or keys" : "Keys"}
                    name="keys"
                    columns={3}
                    error={e.keys}
                    registration={register("keys", clearOnChange("keys"))}
                    options={[
                      { value: "1", label: "1" },
                      { value: "2", label: "2" },
                      { value: "3", label: "3 or more" },
                    ]}
                  />
                </div>
                <ChoiceGroup
                  legend="Charging cables included"
                  name="cables"
                  type="checkbox"
                  columns={4}
                  registration={register("cables")}
                  options={[
                    { value: "type2", label: "Type 2" },
                    { value: "granny", label: "3-pin" },
                    { value: "chademo", label: "CHAdeMO" },
                    { value: "none", label: "None" },
                  ]}
                />
                {isTesla ? (
                  <div className="grid gap-7 sm:grid-cols-2">
                    <ChoiceGroup
                      legend="Full Self-Driving"
                      name="fsd"
                      registration={register("fsd")}
                      options={[
                        { value: "bought", label: "Bought" },
                        { value: "subscription", label: "Subscription" },
                        { value: "none", label: "No" },
                        { value: "unsure", label: "Not sure" },
                      ]}
                    />
                    <ChoiceGroup
                      legend="Enhanced Autopilot"
                      name="eap"
                      columns={3}
                      registration={register("eap")}
                      options={[
                        { value: "bought", label: "Bought" },
                        { value: "none", label: "No" },
                        { value: "unsure", label: "Not sure" },
                      ]}
                    />
                  </div>
                ) : null}
                {isRenault ? (
                  <ChoiceGroup
                    legend="Is the battery leased (battery hire)?"
                    name="batteryLeased"
                    columns={3}
                    registration={register("batteryLeased")}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No, it's owned" },
                      { value: "unsure", label: "Not sure" },
                    ]}
                  />
                ) : null}
                {isVan ? (
                  <div className="space-y-7 rounded-2xl bg-pearl-200/60 p-5 sm:p-6">
                    <ChoiceGroup
                      legend="Who's selling?"
                      name="sellerType"
                      registration={register("sellerType")}
                      options={[
                        { value: "business", label: "A business" },
                        { value: "private", label: "A private seller" },
                      ]}
                    />
                    {sellerType === "business" ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Business name" htmlFor="businessName" error={e.businessName}>
                          {({ describedBy, invalid }) => <TextInput id="businessName" invalid={invalid} aria-describedby={describedBy} autoComplete="organization" {...register("businessName", clearOnChange("businessName"))} />}
                        </Field>
                        <Field label="How many vans?" htmlFor="vehicleCount" optional error={e.vehicleCount}>
                          {({ describedBy, invalid }) => <TextInput id="vehicleCount" invalid={invalid} aria-describedby={describedBy} inputMode="numeric" placeholder="1" {...register("vehicleCount", clearOnChange("vehicleCount"))} />}
                        </Field>
                      </div>
                    ) : null}
                    <ChoiceGroup
                      legend="Is it VAT-qualifying?"
                      name="vatQualifying"
                      columns={3}
                      hint="Most vans bought new by a VAT-registered business are."
                      registration={register("vatQualifying")}
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        { value: "unsure", label: "Not sure" },
                      ]}
                    />
                    <ChoiceGroup
                      legend="Fitted to the van"
                      name="vanFeatures"
                      type="checkbox"
                      columns={4}
                      registration={register("vanFeatures")}
                      options={[
                        { value: "racking", label: "Racking" },
                        { value: "livery", label: "Livery" },
                        { value: "tow-bar", label: "Tow bar" },
                        { value: "conversion", label: "Conversion" },
                      ]}
                    />
                  </div>
                ) : null}
                <ChoiceGroup
                  legend="What would you like to do?"
                  name="intent"
                  columns={3}
                  registration={register("intent")}
                  options={[
                    { value: "sell", label: "Sell it", hint: "A firm offer to buy it outright." },
                    { value: "part-exchange", label: "Part-exchange", hint: "Against a vehicle from our showroom." },
                    { value: "commission", label: "Other options", hint: "Talk to us about selling it for you." },
                  ]}
                />
              </div>

              {/* ------------------------------------------------ step 4: photos */}
              <div hidden={stepId !== "photos"}>
                {stepId === "photos" || photos.length ? <PhotoUploader value={photos} onChange={(nextPhotos) => setValue("photos", nextPhotos, { shouldDirty: true })} /> : null}
              </div>

              {/* ------------------------------------------------ step 5: contact */}
              <div hidden={stepId !== "contact"} className="space-y-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="fullName" error={e.fullName}>
                    {({ describedBy, invalid }) => <TextInput id="fullName" invalid={invalid} aria-describedby={describedBy} autoComplete="name" {...register("fullName", clearOnChange("fullName"))} />}
                  </Field>
                  <Field label="Postcode" htmlFor="postcode" error={e.postcode} hint="Where the vehicle is kept.">
                    {({ describedBy, invalid }) => (
                      <TextInput id="postcode" invalid={invalid} aria-describedby={describedBy} autoComplete="postal-code" autoCapitalize="characters" placeholder="EN11 8TL" {...register("postcode", clearOnChange("postcode"))} />
                    )}
                  </Field>
                  <Field label="Mobile number" htmlFor="phone" error={e.phone}>
                    {({ describedBy, invalid }) => <TextInput id="phone" type="tel" invalid={invalid} aria-describedby={describedBy} autoComplete="tel" inputMode="tel" placeholder="07700 900123" {...register("phone", clearOnChange("phone"))} />}
                  </Field>
                  <Field label="Email address" htmlFor="email" error={e.email}>
                    {({ describedBy, invalid }) => (
                      <TextInput id="email" type="email" invalid={invalid} aria-describedby={describedBy} autoComplete="email" inputMode="email" placeholder="you@example.com" {...register("email", clearOnChange("email"))} />
                    )}
                  </Field>
                </div>
                <ChoiceGroup
                  legend="How should we send your offer?"
                  name="contactPreference"
                  columns={3}
                  error={e.contactPreference}
                  registration={register("contactPreference", clearOnChange("contactPreference"))}
                  options={[
                    { value: "whatsapp", label: "WhatsApp", hint: "Quickest. Reply with questions any time." },
                    { value: "email", label: "Email", hint: "A written offer with a link to accept." },
                    { value: "phone", label: "Phone call", hint: "We'll call, then confirm by email." },
                  ]}
                />
                <Field label="Anything else we should know?" htmlFor="sellerNotes" optional>
                  {() => <TextArea id="sellerNotes" placeholder="Upgrades, recent work, a date you need to sell by…" {...register("sellerNotes")} />}
                </Field>
                <label className="flex cursor-pointer items-start gap-3 text-[0.92rem] leading-relaxed text-carbon-2">
                  <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#1b6a4b]" {...register("marketingOptIn")} />
                  <span>Send me occasional news and offers from {site.brand.fullName}. You can unsubscribe at any time.</span>
                </label>
                {site.turnstileSiteKey && stepId === "contact" ? <Turnstile siteKey={site.turnstileSiteKey} onToken={setTurnstileToken} /> : null}
                <p className="text-[0.85rem] leading-relaxed text-carbon-3">
                  We use your details to prepare and send your offer, as explained in our{" "}
                  <a href="/privacy" target="_blank" className="text-carbon underline underline-offset-4">
                    privacy notice
                  </a>
                  . Nothing is binding until you accept an offer.
                </p>
              </div>
            </div>
          </div>

          {serverError ? (
            <p role="alert" className="mt-5 rounded-2xl bg-alert/10 px-4 py-3 text-[0.92rem] font-medium text-alert ring-1 ring-alert/30">
              {serverError}
            </p>
          ) : null}

          {/* Phones: pinned to the bottom of the screen while the form is in view, then it settles under the form instead of covering the footer. */}
          <div className="sticky bottom-0 z-30 -mx-4 mt-4 bg-night-950/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ring-1 ring-chalk/[0.06] backdrop-blur-xl sm:static sm:mx-0 sm:mt-6 sm:bg-transparent sm:p-0 sm:ring-0 sm:backdrop-blur-none">
            <div className="flex items-center gap-3 sm:justify-between">
              {step > 0 ? (
                <CtaButton type="button" variant="ghost" size="lg" onClick={back} className="flex-none">
                  Back
                </CtaButton>
              ) : (
                <span className="hidden sm:block" />
              )}
              <CtaButton
                type="submit"
                variant={stepId === "contact" ? "ion" : "chalk"}
                size="lg"
                disabled={submitting}
                className="min-w-0 flex-1 sm:w-auto sm:min-w-64 sm:flex-none [&_.cta-inner]:w-full"
              >
                {stepId === "contact" ? (submitting ? "Sending…" : "Send for my offer") : stepId === "photos" && !photos.length ? "Skip for now" : "Continue"}
              </CtaButton>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}

/* ---------------------------------------------------------------- progress */

/** Phones and tablets: five segments over the form. On desktop the stage lists the steps. */
function Progress({ step, onJump }: { step: number; onJump: (index: number) => void }) {
  return (
    <nav aria-label="Quote progress" className="lg:hidden">
      <ol className="grid grid-cols-5 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => onJump(i)} disabled={i >= step} aria-current={i === step ? "step" : undefined} className="group w-full py-3 text-left disabled:cursor-default">
              <span className="block h-1 overflow-hidden rounded-full bg-chalk/10">
                <span
                  className="block h-full origin-left rounded-full bg-ion transition-transform duration-700 ease-glide"
                  style={{ transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})` }}
                />
              </span>
              <span className={clsx("label mt-2.5 max-sm:sr-only sm:block", i === step ? "text-chalk" : "text-chalk-3")}>
                {s.short}
                <span className="sr-only">{i < step ? " (done)" : i === step ? " (current step)" : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------------- stage */

/** Side-on vehicles from the turntable set, by make, so the stage shows something like yours. */
const sideBySlug = (slug: string) => fleet.find((v) => v.slug === slug)?.views[0]?.src;
const MAKE_SIDE: Record<string, string> = {
  BYD: "byd-atto-3",
  Kia: "kia-ev3",
  Hyundai: "hyundai-ioniq-5",
  Volkswagen: "vw-id3",
  Nissan: "nissan-leaf",
  MG: "mg4",
  Peugeot: "peugeot-e208",
  Porsche: "porsche-taycan",
  Audi: "audi-etron-gt",
  "Mercedes-Benz": "mercedes-eqe",
};
const VAN_SIDE: Record<string, string> = { Vauxhall: "vauxhall-vivaro-electric", "Mercedes-Benz": "mercedes-van" };

function stageVehicle(category?: Category, make?: string, model?: string) {
  if (category === "tesla" || make === "Tesla") {
    return model === "Model S" || model === "Model X" ? heroCar.side : (sideBySlug("tesla-model-3") ?? heroCar.side);
  }
  if (category === "van") return sideBySlug(VAN_SIDE[make ?? ""] ?? "") ?? sideBySlug("vauxhall-vivaro-electric") ?? heroCar.side;
  return sideBySlug(MAKE_SIDE[make ?? ""] ?? "") ?? sideBySlug("hyundai-ioniq-5") ?? heroCar.side;
}

/**
 * The left of the page: your vehicle taking shape as you answer. A side-on
 * vehicle like yours under the studio light with its make behind it, your plate
 * as you type it, what we know so far, and the five steps.
 */
function StagePanel({
  registration,
  vehicleTitle,
  mileage,
  batteryHealth,
  category,
  make,
  model,
  photos,
  step,
  onJump,
}: {
  registration: string;
  vehicleTitle: string;
  mileage: string;
  batteryHealth?: string;
  category?: Category;
  make?: string;
  model?: string;
  photos: number;
  step: number;
  onJump: (index: number) => void;
}) {
  const miles = mileage ? Number(String(mileage).replace(/[^\d]/g, "")) : NaN;
  const validReg = registration && isPlausibleReg(registration);
  const side = stageVehicle(category, make, model);
  const word = (make && make !== OTHER ? make : category === "van" ? "Van" : category === "tesla" ? "Tesla" : "Electric").toUpperCase();
  const facts: Array<[string, string, boolean]> = [
    ["Vehicle", vehicleTitle || (category ? categoryLabel[category] : "To come"), Boolean(vehicleTitle)],
    ["Mileage", Number.isFinite(miles) ? `${miles.toLocaleString("en-GB")} mi` : "To come", Number.isFinite(miles)],
    ["Battery health", batteryHealth ? `${batteryHealth}%` : "Optional", Boolean(batteryHealth)],
    ["Photos", photos ? `${photos} added` : "None yet", photos > 0],
  ];
  return (
    // Phones and tablets: a compact strip (words left, vehicle and plate right) so the first question shows straight away.
    <aside className="relative isolate grid grid-cols-[1fr_44%] items-center overflow-hidden rounded-[1.5rem] bg-night-900 ring-1 ring-chalk/[0.07] sm:grid-cols-[1fr_40%] lg:sticky lg:top-24 lg:flex lg:h-[calc(100svh-7.5rem)] lg:items-stretch lg:min-h-[38rem] lg:flex-col lg:self-start lg:rounded-[2rem]">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_58%,rgb(239_237_232/0.09),transparent_70%)]" />
      <div className="p-4 sm:p-7 lg:p-9">
        <p className="eyebrow flex items-center gap-2.5 text-ion max-sm:text-[0.62rem]">
          <span className="ion-dot" /> Your offer, in progress
        </p>
        <h1 className="display mt-2 text-[clamp(1.2rem,0.9rem+1.6vw,2.9rem)] leading-[1.04] lg:mt-3 lg:text-[clamp(1.75rem,1.3rem+1.6vw,2.9rem)]">
          Tell us about it. <em>We&apos;ll do the rest.</em>
        </h1>
      </div>

      {/* the make, set to fit the panel and clear of the vehicle; the vehicle; the plate you've typed */}
      <div className="@container relative py-3 pr-3 sm:py-5 sm:pr-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-center lg:px-9 lg:py-0">
        <p
          aria-hidden
          className="backdrop-word backdrop-word-fill pointer-events-none text-center whitespace-nowrap opacity-70 max-lg:hidden [@media(max-height:940px)]:hidden"
          style={{ fontSize: `min(${(100 / (word.length * 0.95)).toFixed(2)}cqw, 6.5rem)` }}
        >
          {word}
        </p>
        <div className="relative mx-auto aspect-[2.7/1] w-full lg:mt-5 lg:max-w-[34rem]">
          <div aria-hidden className="absolute inset-x-[4%] bottom-[-4%] h-[26%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.12),transparent)]" />
          <div aria-hidden className="absolute inset-x-[12%] bottom-[1%] h-[7%] rounded-[50%] bg-black/80 blur-[8px]" />
          <Image key={side.src} src={side} alt="" fill sizes="(min-width: 1024px) 34rem, 92vw" className="animate-[stage-in_0.6s_var(--ease-glide)] object-contain object-bottom" />
        </div>
        <div className="relative mt-2 flex justify-center lg:mt-5">
          {validReg ? (
            <>
              <Plate reg={registration} size="sm" tone="front" className="lg:hidden" />
              <Plate reg={registration} size="md" tone="front" className="max-lg:hidden" />
            </>
          ) : (
            <span className="text-[0.85rem] text-chalk-3 max-lg:hidden">Your registration will show here</span>
          )}
        </div>
      </div>

      {/* what we know so far */}
      <dl className="mt-6 grid grid-cols-2 gap-px border-t hairline bg-chalk/[0.06] max-lg:hidden [@media(max-height:820px)]:hidden">
        {facts.map(([k, v, done]) => (
          <div key={k} className="bg-night-900 px-9 py-4">
            <dt className="label flex items-center gap-2 text-chalk-3">
              <span className={clsx("size-1.5 rounded-full", done ? "bg-ion" : "bg-chalk/20")} />
              {k}
            </dt>
            <dd className={clsx("mt-1.5 truncate text-[0.95rem] tabular-nums", done ? "text-chalk" : "text-chalk-3")}>{v}</dd>
          </div>
        ))}
      </dl>

      {/* the five steps */}
      <nav aria-label="Quote steps" className="border-t hairline px-9 py-5 max-lg:hidden">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.id} className={clsx("flex items-center gap-1.5", i < STEPS.length - 1 && "min-w-0 flex-1")}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  disabled={!done}
                  aria-current={current ? "step" : undefined}
                  className={clsx("group flex min-w-0 items-center gap-2 text-left disabled:cursor-default", done && "hover:text-chalk")}
                >
                  <span
                    className={clsx(
                      "flex size-6 flex-none items-center justify-center rounded-full text-[0.68rem] font-semibold tabular-nums transition-colors duration-500",
                      done ? "bg-ion text-night-950" : current ? "bg-chalk text-night-950" : "ring-1 ring-chalk/25 text-chalk-3",
                    )}
                  >
                    {done ? (
                      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className={clsx("text-[0.82rem] whitespace-nowrap", current ? "text-chalk" : "sr-only")}>
                    {s.short}
                    <span className="sr-only">{done ? " (done)" : current ? " (current step)" : ""}</span>
                  </span>
                </button>
                {i < STEPS.length - 1 ? <span aria-hidden className={clsx("h-px min-w-1 flex-1", done ? "bg-ion/60" : "bg-chalk/15")} /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t hairline px-9 py-4 text-[0.85rem] text-chalk-3 max-lg:hidden">
        <span className="flex items-center gap-2">
          <span className="ion-dot" /> Priced by hand, {site.promises.quoteTurnaround}
        </span>
        <span className="flex gap-4">
          <a href={`tel:${site.contact.phoneE164}`} className="text-chalk tabular-nums underline-offset-4 hover:underline">
            {site.contact.phoneDisplay}
          </a>
          <a href={whatsappLink("Hi, I'm filling in your quote form and have a question.")} target="_blank" rel="noopener" className="text-ion underline-offset-4 hover:underline">
            WhatsApp
          </a>
        </span>
      </div>
    </aside>
  );
}
