import JsBarcode from "jsbarcode";

/**
 * The bars of a Code 128 barcode as "1" (bar) and "0" (space), one per module.
 * Plain module: the barcode component draws it, and tests read it.
 */
export function code128Bits(value: string): string {
  const target: { encodings?: { data: string }[] } = {};
  JsBarcode(target, value, { format: "CODE128" });
  return (target.encodings ?? []).map((e) => e.data).join("");
}
