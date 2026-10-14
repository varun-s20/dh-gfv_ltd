import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Green Future admin" },
  description: "Green Future buying desk.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "same-origin",
};

export const viewport: Viewport = {
  themeColor: "#06150f",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
