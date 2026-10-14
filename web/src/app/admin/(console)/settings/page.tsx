import { and, count, eq, gt } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import {
  AddAdminForm,
  AdsForm,
  NotificationsForm,
  PasswordForm,
  QuoteDefaultsForm,
  SignOutOthers,
  TeamMemberRow,
  TotpConfirm,
  TotpDisable,
  TotpStart,
} from "@/components/admin/settings-forms";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { dateTime } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/guard";
import { listTeam } from "@/lib/admin/queries";
import { getSettings } from "@/lib/admin/settings";
import { getSession } from "@/lib/auth/session";
import { totpUri } from "@/lib/auth/totp";
import { getDb, schema } from "@/lib/db/client";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { id: "notifications", label: "Notifications" },
  { id: "offers", label: "Offer defaults" },
  { id: "ads", label: "Google Ads" },
  { id: "account", label: "My account" },
  { id: "team", label: "Team", ownerOnly: true },
];

export default async function SettingsPage() {
  const user = await requireAdminPage();
  const isOwner = user.role === "owner";
  const db = await getDb();
  const now = new Date();
  const session = await getSession();

  const [settings, me, sessionCount, team] = await Promise.all([
    getSettings(["notify.emails", "quote.defaults", "ads.conversionName"]),
    db.select({ totpSecret: schema.adminUsers.totpSecret, totpEnabled: schema.adminUsers.totpEnabled }).from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id)),
    db.select({ n: count() }).from(schema.sessions).where(and(eq(schema.sessions.userId, user.id), gt(schema.sessions.expiresAt, now))),
    isOwner ? listTeam() : Promise.resolve([]),
  ]);

  const mine = me[0];
  // The pending secret is only rendered while set-up is in progress, for the person setting it up.
  const pendingSecret = mine && !mine.totpEnabled && mine.totpSecret ? mine.totpSecret : null;
  const qr = pendingSecret
    ? await QRCode.toDataURL(totpUri(pendingSecret, user.email, `${site.brand.name} admin`), { margin: 1, width: 400, errorCorrectionLevel: "M", color: { dark: "#0d1311", light: "#ffffff" } })
    : null;
  const envFallback = (process.env.ADMIN_NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const others = Math.max(0, Number(sessionCount[0]?.n ?? 0) - (session ? 1 : 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description={isOwner ? "Business settings, your account and the team." : "Your account. Business settings are managed by an owner."} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {SECTIONS.filter((s) => !s.ownerOnly || isOwner).map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-sm whitespace-nowrap text-slate hover:bg-ink/[0.05] hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6 [&>section]:scroll-mt-24">
          <Card id="notifications" title="Notifications" description="Who hears about new leads and offer responses">
            <NotificationsForm emails={settings["notify.emails"]} canEdit={isOwner} envFallback={envFallback} />
          </Card>

          <Card id="offers" title="Offer defaults" description="Prefilled in the offer builder on every lead">
            <QuoteDefaultsForm conditions={settings["quote.defaults"].conditions} validDays={settings["quote.defaults"].validDays} canEdit={isOwner} />
          </Card>

          <Card id="ads" title="Google Ads" description="Offline conversion import">
            <AdsForm conversionName={settings["ads.conversionName"]} canEdit={isOwner} />
          </Card>

          <Card id="account" title="My account" description={`${user.name} · ${user.email} · ${isOwner ? "Owner" : "Staff"}`} bodyClassName="divide-y divide-ink/[0.07] p-0">
            <div className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-ink">Password</h3>
              <PasswordForm email={user.email} />
            </div>
            <div className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">Two-step verification</h3>
                {mine?.totpEnabled ? (
                  <Badge tone="ok">
                    <ShieldCheck aria-hidden className="size-3.5" />
                    On
                  </Badge>
                ) : (
                  <Badge tone="warn">Off</Badge>
                )}
              </div>
              {mine?.totpEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate">Signing in asks for a 6-digit code from your authenticator app as well as your password.</p>
                  <TotpDisable />
                </div>
              ) : qr && pendingSecret ? (
                <TotpConfirm qr={qr} secret={pendingSecret} account={user.email} />
              ) : (
                <div className="space-y-3">
                  <p className="max-w-prose text-sm text-slate">
                    Protect the leads and sellers&apos; details with a code from your phone. Strongly recommended for owners and anyone signing in away from the office.
                  </p>
                  <TotpStart />
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-ink">Devices</h3>
              <SignOutOthers others={others} />
            </div>
          </Card>

          {isOwner ? (
            <Card id="team" title="Team" description="Everyone who can sign in to the admin" bodyClassName="p-0">
              <ul className="divide-y divide-ink/[0.07]">
                {team.map((m) => (
                  <TeamMemberRow
                    key={m.id}
                    isSelf={m.id === user.id}
                    member={{
                      id: m.id,
                      name: m.name,
                      email: m.email,
                      role: m.role,
                      disabled: m.disabled,
                      totpEnabled: m.totpEnabled,
                      lastLogin: m.lastLoginAt ? dateTime(m.lastLoginAt, now) : null,
                      sessions: m.sessions,
                    }}
                  />
                ))}
              </ul>
              <div className="border-t border-ink/[0.07] bg-ivory/40 p-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">Add someone</h3>
                <AddAdminForm />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
