import { describe, expect, it } from "vitest";
import { code128Bits } from "./code128";
import { isStudentId, normalizeStudentId, randomStudentId } from "./student-id";

describe("student IDs", () => {
  it("accepts a V and 8 digits only", () => {
    expect(isStudentId("V00946178")).toBe(true);
    expect(isStudentId("v00946178")).toBe(false);
    expect(isStudentId("V0094617")).toBe(false);
  });

  it("normalizes spaces and case", () => {
    expect(normalizeStudentId(" v00 946178\n")).toBe("V00946178");
  });

  it("makes valid random IDs", () => {
    for (let i = 0; i < 50; i++) expect(isStudentId(randomStudentId())).toBe(true);
  });
});

describe("code128Bits", () => {
  it("encodes an ID as Code 128: start, 9 characters, check digit and stop", () => {
    const bits = code128Bits("V00946178");
    // Code 128 B: 11 modules for the start, each character and the check
    // digit, and 13 for the stop bar. A V and 8 digits fit 1 + 9 + 1 symbols.
    expect(bits.length).toBeGreaterThanOrEqual(11 * 8 + 13);
    expect(bits).toMatch(/^[01]+$/);
    expect(bits.startsWith("11010")).toBe(true); // start code B or C
    expect(bits.endsWith("1100011101011")).toBe(true); // stop pattern
  });
});

describe("the barcode can be read back", () => {
  it("decodes to the student ID with the same reader the desk camera uses", async () => {
    const { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } =
      await import("@zxing/library");
    const bits = code128Bits("V00946178");
    const scale = 3;
    const quiet = 10 * scale;
    const width = bits.length * scale + quiet * 2;
    const height = 60;
    const pixels = new Uint8ClampedArray(width * height).fill(255);
    for (let x = 0; x < bits.length; x++) {
      if (bits[x] !== "1") continue;
      for (let dx = 0; dx < scale; dx++) {
        for (let y = 0; y < height; y++) pixels[y * width + quiet + x * scale + dx] = 0;
      }
    }
    const reader = new MultiFormatReader();
    reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]));
    const result = reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height))));
    expect(result.getText()).toBe("V00946178");
  });
});
