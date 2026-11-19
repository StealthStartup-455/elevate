"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { getStaffContext } from "@/features/auth/staff";
import { db } from "@/lib/db";
import { forgetGym, getGym, getGymById } from "@/lib/gym";
import { logEvent } from "@/lib/log";
import { canActForClimber, canEditWaiver } from "./access";
import { hashWaiver } from "./hash";
import { getSignedWaiverForStaff, type SignedWaiverView } from "./queries";
import { parseWaiverSignature, type WaiverFieldErrors } from "./validate";
import { nextVersion, parseWaiverWording, type WordingFieldErrors } from "./wording";

// Server actions are public POST endpoints, so submitWaiver checks the caller
// itself, and reads the climber and the wording from the database rather than
// trusting anything the browser sends except what the person typed or ticked.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_USER_AGENT_LENGTH = 500;

export type WaiverFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: WaiverFieldErrors;
  /** Echoed back after an error so the form keeps what was typed and ticked. */
  values?: WaiverFormValues;
  /** Set once signed, for the "View your waiver" link. */
  waiverId?: string;
};

export type WaiverFormValues = {
  clauses: string[];
  guardianName: string;
  signerRelation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  signatureImage: string;
  agree: boolean;
};

function valuesOf(formData: FormData): WaiverFormValues {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    clauses: formData.getAll("clause").map(String),
    guardianName: text("guardianName"),
    signerRelation: text("signerRelation"),
    emergencyContactName: text("emergencyContactName"),
    emergencyContactPhone: text("emergencyContactPhone"),
    signatureImage: text("signatureImage"),
    agree: formData.get("agree") === "on",
  };
}

// The first address in x-forwarded-for is the browser's; the rest are proxies.
function clientIp(list: Headers): string | null {
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || null;
}

export async function submitWaiver(
  _prev: WaiverFormState,
  formData: FormData,
): Promise<WaiverFormState> {
  const climberId = String(formData.get("climberId") ?? "");
  if (!UUID.test(climberId)) return { status: "error", message: "Climber not found." };
  if (!(await canActForClimber(climberId))) {
    return { status: "error", message: "Log in to sign the waiver." };
  }

  const gym = await getGym();
  const [climber, template] = await Promise.all([
    db.climber.findFirst({
      where: { id: climberId, gymId: gym.id },
      select: { firstName: true, lastName: true, dateOfBirth: true },
    }),
    gym.waiverVersion
      ? db.waiverTemplate.findUnique({
          where: { gymId_version: { gymId: gym.id, version: gym.waiverVersion } },
        })
      : null,
  ]);
  if (!climber) return { status: "error", message: "Climber not found." };
  if (!template) {
    return { status: "error", message: "The gym hasn't set up its waiver yet. Ask at the desk." };
  }
  // The gym published new wording while they were reading: they must read it.
  if (formData.get("templateVersion") !== template.version) {
    return {
      status: "error",
      message: "The gym has updated its waiver. Reload the page and read the new one.",
    };
  }
  // The stored text must still be the text that was published.
  const bodyHash = hashWaiver(template);
  if (bodyHash !== template.bodyHash) {
    logEvent("waiver_template_hash_mismatch", { gymId: gym.id, version: template.version });
    return { status: "error", message: "The waiver couldn't be loaded. Ask at the desk." };
  }

  const parsed = parseWaiverSignature(
    formData,
    {
      fullName: `${climber.firstName} ${climber.lastName}`,
      dateOfBirth: climber.dateOfBirth.toISOString().slice(0, 10),
    },
    template.clauses.length,
  );
  if (!parsed.ok) {
    logEvent("waiver_form_invalid", {
      gymId: gym.id,
      fields: Object.keys(parsed.errors).sort().join(","),
    });
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.errors,
      values: valuesOf(formData),
    };
  }

  const list = await headers();
  const waiver = await db.waiver.create({
    data: {
      gymId: gym.id,
      climberId,
      version: template.version,
      templateId: template.id,
      bodyHash,
      ...parsed.value,
      signedByAuthUserId: (await getCurrentUser())?.authUserId ?? null,
      ipAddress: clientIp(list),
      userAgent: list.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
    },
    select: { id: true },
  });

  logEvent("waiver_signed", {
    gymId: gym.id,
    climberId,
    version: template.version,
    relation: parsed.value.signerRelation,
  });
  revalidatePath("/me", "layout");
  revalidatePath("/desk");
  revalidatePath(`/desk/customers/${climberId}`);
  return { status: "success", waiverId: waiver.id };
}

export type WordingFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: WordingFieldErrors;
  /** Echoed back after an error so the editor keeps what was typed. */
  values?: { title: string; body: string; clauses: string; confirm: boolean };
};

type Published = { kind: "published"; version: string } | { kind: "stale" } | { kind: "unchanged" };

/**
 * Publishes new waiver wording for the staff member's gym (#110). It never
 * edits a published version: it adds the next one ("v2") and points
 * Gym.waiverVersion at it, so every climber must sign again.
 */
export async function publishWaiver(
  _prev: WordingFormState,
  formData: FormData,
): Promise<WordingFormState> {
  const staff = await getStaffContext();
  if (!staff || !(await canEditWaiver())) {
    return { status: "error", message: "Only a manager or owner can publish the waiver." };
  }

  const values = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    clauses: String(formData.get("clauses") ?? ""),
    confirm: formData.get("confirm") === "on",
  };
  const parsed = parseWaiverWording(formData);
  if (!parsed.ok) {
    return { status: "error", message: "Check the highlighted fields.", errors: parsed.errors, values };
  }
  const bodyHash = hashWaiver(parsed.value);
  // The version the editor was opened on, so two managers can't overwrite each other.
  const baseVersion = String(formData.get("baseVersion") ?? "");

  let result: Published;
  try {
    result = await db.$transaction(async (tx): Promise<Published> => {
      const gym = await tx.gym.findUniqueOrThrow({
        where: { id: staff.gymId },
        select: { waiverVersion: true },
      });
      if (baseVersion !== (gym.waiverVersion ?? "")) return { kind: "stale" };
      const templates = await tx.waiverTemplate.findMany({
        where: { gymId: staff.gymId },
        select: { version: true, bodyHash: true },
      });
      const current = templates.find((t) => t.version === gym.waiverVersion);
      if (current?.bodyHash === bodyHash) return { kind: "unchanged" };

      const version = nextVersion(templates.map((t) => t.version));
      await tx.waiverTemplate.create({
        data: { gymId: staff.gymId, version, ...parsed.value, bodyHash },
      });
      await tx.gym.update({ where: { id: staff.gymId }, data: { waiverVersion: version } });
      return { kind: "published", version };
    });
  } catch (error) {
    // Someone published the same next version at the same moment (unique gymId + version).
    if ((error as { code?: string }).code === "P2002") result = { kind: "stale" };
    else throw error;
  }

  if (result.kind === "stale") {
    return {
      status: "error",
      message: "Someone else published a new version while you were editing. Reload and start from it.",
      values,
    };
  }
  if (result.kind === "unchanged") {
    return { status: "error", message: "Nothing changed: this is the wording climbers sign now.", values };
  }

  // The gym row is cached for a minute per server; this server forgets it now.
  forgetGym();
  logEvent("waiver_published", { gymId: staff.gymId, version: result.version, staffId: staff.id });
  revalidatePath("/desk", "layout");
  revalidatePath("/me", "layout");
  redirect(`/desk/waivers?published=${result.version}`);
}

/**
 * A signed waiver for the desk's "Look at waiver" dialog (#147, #214). Staff
 * only, and only from the staff member's own gym; anyone else gets null.
 */
export async function readDeskWaiver(
  waiverId: string,
): Promise<{ waiver: SignedWaiverView; timeZone: string } | null> {
  if (!UUID.test(waiverId)) return null;
  const staff = await getStaffContext();
  if (!staff) return null;
  const [waiver, gym] = await Promise.all([getSignedWaiverForStaff(waiverId), getGymById(staff.gymId)]);
  return waiver && gym ? { waiver, timeZone: gym.timeZone } : null;
}
