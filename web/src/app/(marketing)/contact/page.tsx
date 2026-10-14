import { Clock, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { CinemaHero } from "@/components/cinema/cinema-hero";
import { Reveal } from "@/components/motion/reveal";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/primitives";
import { site, whatsappLink } from "@/lib/site";
import keys from "../../../../public/media/photos/key-handover.jpg";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `Talk to ${site.brand.fullName} about selling your Tesla, electric car or van: WhatsApp, phone or email.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { contact, company } = site;
  const cards = [
    { icon: <WhatsAppIcon className="size-5" />, title: "WhatsApp", body: "Photos, questions, quick answers.", href: whatsappLink("Hi, I'd like to talk about selling my vehicle."), cta: "Message us", external: true },
    { icon: <PhoneIcon className="size-5" />, title: "Call", body: contact.phoneDisplay, href: `tel:${contact.phoneE164}`, cta: "Call now" },
    ...(contact.email ? [{ icon: <Mail className="size-5" strokeWidth={1.6} />, title: "Email", body: contact.email, href: `mailto:${contact.email}`, cta: "Write to us" }] : []),
    {
      icon: <MapPin className="size-5" strokeWidth={1.6} />,
      title: "Visit",
      body: `Showroom: ${company.showroom}`,
      href: whatsappLink("Hi, I'd like to book a visit to your showroom."),
      cta: "Book a visit",
      external: true,
    },
  ];
  return (
    <>
      <CinemaHero
        label="Contact"
        word="Talk"
        title="Talk to a *person.*"
        sub="Every message is answered by a specialist, not a call centre."
        visual={{ kind: "photo", src: keys, alt: "A hand holding a car key inside a car" }}
      />

      <section className="sheet bg-night-950 pt-16 pb-20 sm:pt-20" data-nav-theme="night">
        <Reveal className={`container-page grid gap-3 sm:grid-cols-2 ${cards.length > 3 ? "lg:grid-cols-4" : "md:grid-cols-3"}`} stagger={0.06}>
          {cards.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener" : undefined}
              className="group flex flex-col justify-between gap-10 rounded-[1.75rem] surface-night p-7 transition-[transform,background-color] duration-500 ease-glide hover:-translate-y-1 hover:bg-night-750"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-chalk text-night-950 transition-colors duration-300 group-hover:bg-ion">{c.icon}</span>
              <span>
                <span className="block font-display text-[1.5rem] font-medium tracking-[-0.025em]">{c.title}</span>
                <span className="mt-1 block break-words text-chalk-2 tabular-nums">{c.body}</span>
                <span className="label mt-6 inline-flex text-chalk transition-transform duration-500 ease-glide group-hover:translate-x-1">{c.cta} →</span>
              </span>
            </a>
          ))}
        </Reveal>
      </section>

      <section className="on-pearl sheet py-24 sm:py-32" data-nav-theme="pearl">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="display text-d2">
              Or send <em>a message.</em>
            </h2>
            <ul className="mt-10 space-y-5 text-carbon-2">
              <li className="flex gap-3">
                <Clock aria-hidden className="mt-0.5 size-5 flex-none text-carbon-3" strokeWidth={1.6} />
                {contact.hours}
              </li>
              <li className="flex gap-3">
                <MapPin aria-hidden className="mt-0.5 size-5 flex-none text-carbon-3" strokeWidth={1.6} />
                <span>
                  Showroom: {company.showroom}
                  <br />
                  Registered office: {company.registeredOffice}
                </span>
              </li>
            </ul>
            <p className="mt-10 text-[0.85rem] leading-relaxed text-carbon-3">
              {company.legalName}, registered in {company.registeredIn}, company {company.companyNumber}.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
