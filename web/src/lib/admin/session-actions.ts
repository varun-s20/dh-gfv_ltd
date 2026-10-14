"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth/session";
import { audit } from "@/lib/security";

/** Sign out of this device. Works with or without a completed second factor. */
export async function signOut() {
  const session = await getSession();
  await destroySession();
  if (session) await audit("admin.logout", { actorId: session.user.id, actorEmail: session.user.email });
  redirect("/admin/login");
}
