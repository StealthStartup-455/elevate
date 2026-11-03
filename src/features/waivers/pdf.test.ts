import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildWaiverPdf, pdfSafe, waiverFileName } from "./pdf";
import type { SignedWaiverView } from "./queries";

const DOT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const GYM = { name: "Elevate Demo Gym", timeZone: "America/Vancouver" };

const WAIVER: SignedWaiverView = {
  id: "0b7a1d4e-6f0c-4c39-9a57-2f2b8f4f9d10",
  climberId: "5a3f2b1c-0d4e-4f6a-8b7c-9d0e1f2a3b4c",
  climberName: "Zoë Tremblay",
  version: "v1",
  // 23:30 in Vancouver on Nov 2 is already Nov 3 in UTC.
  signedAt: new Date("2026-11-03T07:30:00Z"),
  signedByName: "Marie Tremblay",
  signerRelation: "PARENT",
  signatureText: null,
  signatureImage: DOT_PNG,
  emergencyContact: { name: "Luc Tremblay", phone: "(250) 555-0199" },
  template: {
    title: "Release of liability",
    paragraphs: ["Climbing is dangerous.", "Read this before you sign."],
    clauses: ["I understand climbing can cause serious injury or death."],
  },
  bodyHash: "a".repeat(64),
  wordingIntact: true,
};

async function pages(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("buildWaiverPdf", () => {
  it("makes a one page PDF for a short waiver", async () => {
    const bytes = await buildWaiverPdf(WAIVER, GYM);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(await pages(bytes)).toBe(1);
  });

  it("adds pages for long wording", async () => {
    const long = { ...WAIVER.template!, paragraphs: Array(40).fill("Lorem ipsum dolor sit amet. ".repeat(12)) };
    expect(await pages(await buildWaiverPdf({ ...WAIVER, template: long }, GYM))).toBeGreaterThan(1);
  });

  it("works without wording, signature image or emergency contact (imported waivers)", async () => {
    const bare = {
      ...WAIVER,
      template: null,
      signatureImage: null,
      emergencyContact: null,
      bodyHash: null,
      signatureText: "Zoe Tremblay",
    };
    expect(await pages(await buildWaiverPdf(bare, GYM))).toBe(1);
  });

  it("doesn't fail on characters the built-in font can't draw", async () => {
    const odd = { ...WAIVER, climberName: "王小明 🧗", signedByName: "Ольга" };
    expect(await pages(await buildWaiverPdf(odd, GYM))).toBe(1);
  });
});

describe("pdfSafe", () => {
  it("keeps Latin accents and curly quotes, and replaces the rest", () => {
    expect(pdfSafe("Zoë’s “waiver” – ok")).toBe("Zoë’s “waiver” – ok");
    expect(pdfSafe("王 🧗")).toBe("? ?");
  });
});

describe("waiverFileName", () => {
  it("uses the climber's name and the signing day in the gym's time zone", () => {
    expect(waiverFileName(WAIVER, GYM.timeZone)).toBe("waiver-zoe-tremblay-2026-11-02.pdf");
  });
});
