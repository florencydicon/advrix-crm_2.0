"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { validateEmail, validateFullName, validatePhone } from "@/lib/validation";

const LEAD_STATUSES = ["new", "contacted", "follow_up", "proposal", "won", "lost"];
const LEAD_SOURCES = ["website", "referral", "instagram", "cold_outreach", "walk_in", "other"];

/**
 * Lead access + data isolation:
 * SALES sees only their own leads; SUPER_ADMIN and PROJECT_MANAGER see everything.
 */
async function requireLeadAccess() {
  const session = await getSession();
  if (!session) return null;
  if (session.role_key === "SALES") return { session, ownerId: session.sub };
  if (["SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) return { session, ownerId: null };
  return null;
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    company: String(formData.get("company") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    source: String(formData.get("source") || "other"),
    status: String(formData.get("status") || ""),
    deal_value: Number(String(formData.get("deal_value") || "0").replace(/[^0-9.-]/g, "")) || 0,
    notes: String(formData.get("notes") || "").trim() || null,
    next_follow_up: String(formData.get("next_follow_up") || "") || null,
  };
}

export async function createLeadAction(formData: FormData) {
  const access = await requireLeadAccess();
  if (!access || !["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"].includes(access.session.role_key)) {
    return { error: "Not authorized." };
  }

  const f = readForm(formData);
  const nameErr = validateFullName(f.name);
  if (nameErr) return { error: nameErr };
  if (f.email) {
    const emailErr = validateEmail(f.email);
    if (emailErr) return { error: emailErr };
  }
  if (f.phone) {
    const phoneErr = validatePhone(f.phone);
    if (phoneErr) return { error: phoneErr };
  }
  if (!LEAD_SOURCES.includes(f.source)) return { error: "Invalid lead source." };

  await query(
    `INSERT INTO leads (name, company, email, phone, source, status, deal_value, notes, next_follow_up, owner_id)
     VALUES ($1, $2, $3, $4, $5, 'new', $6, $7, $8, $9)`,
    [f.name, f.company, f.email, f.phone, f.source, f.deal_value, f.notes, f.next_follow_up, access.session.sub]
  );

  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const access = await requireLeadAccess();
  if (!access) return { error: "Not authorized." };

  const f = readForm(formData);
  const nameErr = validateFullName(f.name);
  if (nameErr) return { error: nameErr };
  if (f.email) {
    const emailErr = validateEmail(f.email);
    if (emailErr) return { error: emailErr };
  }
  if (f.phone) {
    const phoneErr = validatePhone(f.phone);
    if (phoneErr) return { error: phoneErr };
  }
  if (!LEAD_SOURCES.includes(f.source)) return { error: "Invalid lead source." };

  let sqlTxt = `UPDATE leads SET
       name = $2, company = $3, email = $4, phone = $5, source = $6,
       deal_value = $7, notes = $8, next_follow_up = $9, updated_at = now()
     WHERE id = $1`;
  const args: unknown[] = [leadId, f.name, f.company, f.email, f.phone, f.source, f.deal_value, f.notes, f.next_follow_up];
  if (access.ownerId) {
    sqlTxt += ` AND owner_id = $10`;
    args.push(access.ownerId);
  }

  await query(sqlTxt, args);
  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  const access = await requireLeadAccess();
  if (!access) return { error: "Not authorized." };
  if (!LEAD_STATUSES.includes(status)) return { error: "Invalid status." };

  let sqlTxt = `UPDATE leads SET status = $2, updated_at = now() WHERE id = $1`;
  const args: unknown[] = [leadId, status];
  if (access.ownerId) {
    sqlTxt += ` AND owner_id = $3`;
    args.push(access.ownerId);
  }
  await query(sqlTxt, args);
  revalidatePath("/leads");
  return { ok: true };
}

export async function setFollowUpAction(leadId: string, date: string) {
  const access = await requireLeadAccess();
  if (!access) return { error: "Not authorized." };

  let sqlTxt = `UPDATE leads SET next_follow_up = $2, updated_at = now() WHERE id = $1`;
  const args: unknown[] = [leadId, date || null];
  if (access.ownerId) {
    sqlTxt += ` AND owner_id = $3`;
    args.push(access.ownerId);
  }
  await query(sqlTxt, args);
  revalidatePath("/leads");
  return { ok: true };
}

export async function deleteLeadAction(leadId: string) {
  const access = await requireLeadAccess();
  if (!access) return { error: "Not authorized." };

  let sqlTxt = `DELETE FROM leads WHERE id = $1`;
  const args: unknown[] = [leadId];
  if (access.ownerId) {
    sqlTxt += ` AND owner_id = $2`;
    args.push(access.ownerId);
  }
  await query(sqlTxt, args);
  revalidatePath("/leads");
  return { ok: true };
}

/** Convert a won lead into a client account. */
export async function convertLeadAction(leadId: string) {
  const access = await requireLeadAccess();
  if (!access) return { error: "Not authorized." };

  let sqlTxt = `SELECT id, name, company, email, phone FROM leads WHERE id = $1`;
  const args: unknown[] = [leadId];
  if (access.ownerId) {
    sqlTxt += ` AND owner_id = $2`;
    args.push(access.ownerId);
  }
  const lead = (
    await query<{ id: string; name: string; company: string | null; email: string | null; phone: string | null; converted_client_id: string | null }>(
      sqlTxt,
      args
    )
  )[0];
  if (!lead) return { error: "Lead not found." };
  if (lead.converted_client_id) return { error: "This lead was already converted to a client." };

  const client = (
    await query<{ id: string }>(
      `INSERT INTO clients (name, company, email, phone, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [lead.name, lead.company, lead.email, lead.phone, access.session.sub]
    )
  )[0];

  await query(
    `UPDATE leads SET status = 'won', converted_client_id = $2, updated_at = now() WHERE id = $1`,
    [leadId, client.id]
  );

  await createNotification({
    userId: access.session.sub,
    type: "system",
    title: "Lead converted",
    body: `"${lead.name}" is now a client.`,
    link: "/clients",
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  return { ok: true, clientId: client.id };
}
