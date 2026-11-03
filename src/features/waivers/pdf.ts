import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { colors } from "@/components/ui/theme/tokens";
import type { SignedWaiverView } from "./queries";

// A signed waiver as a PDF (#111). It's built on download from the saved
// record (the exact wording, signature and hash never change), so no file is
// stored. Letter size, the built-in Helvetica, plain dark text on white so it
// prints the same whatever theme the person downloading it uses.

const RELATION = { SELF: "themselves", PARENT: "parent", GUARDIAN: "legal guardian" } as const;

const PAGE = { width: 612, height: 792 }; // US Letter, in points
const MARGIN = 54;
const WIDTH = PAGE.width - MARGIN * 2;
const SIZE = { title: 16, heading: 12, body: 10, small: 8 };
const LINE = 1.4;

// Same ink as the signature pad, so the PDF reads like the screen in light mode.
const INK = hexToRgb(colors.light.text);
const MUTED = hexToRgb(colors.light.muted);

// The built-in fonts only cover Windows-1252. Anything else (an emoji, a
// non-Latin name) becomes "?" rather than failing the whole download.
const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function pdfSafe(text: string): string {
  return Array.from(text.normalize("NFC"))
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (ch === "\n") return " ";
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return ch;
      return CP1252_EXTRA.includes(ch) ? ch : "?";
    })
    .join("");
}

/** "waiver-alex-nguyen-2026-11-03.pdf", in the gym's time zone. */
export function waiverFileName(waiver: SignedWaiverView, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(waiver.signedAt);
  const name = waiver.climberName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `waiver-${name || "climber"}-${day}.pdf`;
}

export async function buildWaiverPdf(
  waiver: SignedWaiverView,
  gym: { name: string; timeZone: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfSafe(`Signed waiver: ${waiver.climberName}`));
  pdf.setSubject(pdfSafe(gym.name));
  pdf.setProducer("Elevate");
  pdf.setCreationDate(new Date());

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const writer = new Writer(pdf, regular);

  const signedAt = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: gym.timeZone,
  }).format(waiver.signedAt);

  writer.text(gym.name, { font: bold, size: SIZE.heading, color: MUTED });
  writer.text(waiver.template?.title ?? "Signed waiver", { font: bold, size: SIZE.title });
  writer.gap(8);

  if (!waiver.wordingIntact) {
    writer.text("Warning: the stored wording no longer matches what was signed.", { font: bold });
    writer.gap(8);
  }

  if (waiver.template) {
    for (const paragraph of waiver.template.paragraphs) {
      writer.text(paragraph);
      writer.gap(6);
    }
    writer.gap(4);
    writer.text("Rules agreed to", { font: bold, size: SIZE.heading });
    for (const clause of waiver.template.clauses) writer.text(`[x]  ${clause}`, { indent: 8 });
  } else {
    writer.text(
      "This waiver was signed before online waivers, so its wording isn't stored in Elevate. Ask the gym for a copy.",
    );
  }

  writer.gap(16);
  writer.text("Signature", { font: bold, size: SIZE.heading });
  const relation = waiver.signerRelation === "SELF" ? "" : ` (${RELATION[waiver.signerRelation]})`;
  writer.text(`Signed for ${waiver.climberName} by ${waiver.signedByName}${relation}`);
  writer.text(`${signedAt} (${gym.timeZone}), version ${waiver.version}`);
  if (waiver.emergencyContact) {
    writer.text(`Emergency contact: ${waiver.emergencyContact.name}, ${waiver.emergencyContact.phone}`);
  }
  if (waiver.signatureText) writer.text(`Typed signature: ${waiver.signatureText}`);
  if (waiver.signatureImage) await writer.image(waiver.signatureImage, 72);

  writer.gap(16);
  const small = { size: SIZE.small, color: MUTED };
  writer.text(`Waiver ${waiver.id}`, small);
  if (waiver.bodyHash) writer.text(`Wording fingerprint (SHA-256): ${waiver.bodyHash}`, small);
  writer.text(
    waiver.template
      ? waiver.wordingIntact
        ? "The wording above matches the fingerprint saved when it was signed."
        : "The wording above does NOT match the fingerprint saved when it was signed."
      : "No wording was stored for this waiver.",
    small,
  );

  writer.pageNumbers();
  return pdf.save();
}

// Lays text out top to bottom, wrapping lines and adding pages as needed.
class Writer {
  private page: PDFPage;
  private y: number;
  private pages: PDFPage[] = [];

  constructor(
    private pdf: PDFDocument,
    private font: PDFFont,
  ) {
    this.page = this.addPage();
    this.y = PAGE.height - MARGIN;
  }

  text(
    raw: string,
    {
      font = this.font,
      size = SIZE.body,
      color = INK,
      indent = 0,
    }: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {},
  ) {
    for (const line of wrap(pdfSafe(raw), font, size, WIDTH - indent)) {
      this.room(size * LINE);
      this.y -= size * LINE;
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color });
    }
  }

  gap(points: number) {
    this.y -= points;
  }

  async image(dataUrl: string, height: number) {
    const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
    if (!match) return;
    const png = await this.pdf.embedPng(Buffer.from(match[1], "base64"));
    const width = Math.min(WIDTH, (png.width / png.height) * height);
    this.room(height + 4);
    this.y -= height + 4;
    this.page.drawImage(png, { x: MARGIN, y: this.y, width, height: (width / png.width) * png.height });
  }

  pageNumbers() {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      const label = `Page ${i + 1} of ${total}`;
      const width = this.font.widthOfTextAtSize(label, SIZE.small);
      page.drawText(label, {
        x: PAGE.width - MARGIN - width,
        y: MARGIN / 2,
        size: SIZE.small,
        font: this.font,
        color: MUTED,
      });
    });
  }

  private room(needed: number) {
    if (this.y - needed < MARGIN) {
      this.page = this.addPage();
      this.y = PAGE.height - MARGIN;
    }
  }

  private addPage() {
    const page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.pages.push(page);
    return page;
  }
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  return line ? [...lines, line] : lines.length ? lines : [""];
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** The download: a PDF attachment that browsers and proxies never cache. */
export async function waiverPdfResponse(
  waiver: SignedWaiverView,
  gym: { name: string; timeZone: string },
): Promise<Response> {
  const bytes = await buildWaiverPdf(waiver, gym);
  return new Response(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${waiverFileName(waiver, gym.timeZone)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
