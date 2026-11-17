// Short desk sounds for a new arrival (#225): a ding when they're ready to
// check in, a low buzz when something is missing. Made with the Web Audio API,
// so there are no sound files to load. Browsers block sound until someone has
// clicked or typed on the page; then this does nothing and the toast alone
// still shows the result.

let context: AudioContext | null = null;

export type ScanSound = "ding" | "buzz";

export function playScanSound(kind: ScanSound, delaySeconds = 0): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    const start = context.currentTime + delaySeconds;
    const length = kind === "ding" ? 0.35 : 0.45;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = kind === "ding" ? "sine" : "square";
    osc.frequency.value = kind === "ding" ? 880 : 140;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === "ding" ? 0.3 : 0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + length);
  } catch {
    // No audio in this browser, or it's blocked: the visual toast still works.
  }
}
