import type { Route } from "next";

export type NavItem = { label: string; href: Route; detail?: string };

/** Either side of the centred wordmark, as on zoox.com. */
export const navLeft: NavItem[] = [
  { label: "Sell a Tesla", href: "/sell-my-tesla" },
  { label: "Electric cars", href: "/sell-my-electric-car" },
];

export const navRight: NavItem[] = [
  { label: "Electric vans", href: "/sell-my-electric-van" },
  { label: "How it works", href: "/how-it-works" },
];

/** The drawer's large rows. */
export const menuPrimary: NavItem[] = [
  { label: "Sell my Tesla", href: "/sell-my-tesla", detail: "Model 3, Y, S and X" },
  { label: "Sell my electric car", href: "/sell-my-electric-car", detail: "Every make, every year" },
  { label: "Sell my electric van", href: "/sell-my-electric-van", detail: "One van or a whole fleet" },
  { label: "How it works", href: "/how-it-works", detail: "Three steps to a firm offer" },
];

export const menuSecondary: NavItem[] = [
  { label: "Why sell to us", href: "/why-sell-to-us" },
  { label: "Brands we buy", href: "/brands" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookies", href: "/cookies" },
];
