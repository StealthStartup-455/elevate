// Fixed sizes for the demo frames, in CSS pixels. They never change with the
// window: a smaller window scrolls, a bigger one adds space around the device.
export type DeviceKind = "phone" | "desktop";

export const DEVICES = {
  // iPhone 17 Pro, 402 x 874 pt. Update here when the demo phone changes.
  phone: {
    screenWidth: 402,
    screenHeight: 874,
    bezel: 12,
    // The status bar (clock, island) and the home bar sit outside the app, so
    // the app's own header and bottom tabs are never covered.
    statusBar: 54,
    homeBar: 24,
    screenRadius: 56,
  },
  // The /demo page has no fixed size: it fills the window, inside a thin
  // tablet-style bezel (iPad look). Sizes of the bezel only.
  desktop: {
    gap: 8, // space between the window edge and the device
    bezel: 12,
    deviceRadius: 28,
    screenRadius: 16,
  },
} as const;
