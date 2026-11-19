"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useEffect, useRef, useState } from "react";

// The camera half of the desk's Check in dialog (#38): shows the device camera
// (the rear one on an iPad) and calls onRead with the text of every Code 128
// barcode it reads, once per REPEAT_MS for the same barcode. The camera runs
// only while this is mounted, so closing the dialog or leaving the search step
// turns it off. zxing loads here, not with the page. Needs https or localhost.
// Without a camera, or permission, it says so and the search box still works.

const REPEAT_MS = 2000;

type Facing = "environment" | "user";
const FACING_KEY = "elevate.desk.camera";

// The camera the desk last chose on this device: the back one ("environment")
// to start with, the front one ("user") for an iPad propped up on the desk.
function savedFacing(): Facing {
  try {
    return localStorage.getItem(FACING_KEY) === "user" ? "user" : "environment";
  } catch {
    return "environment";
  }
}

export default function BarcodeCamera({ onRead }: { onRead: (text: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Only mounted once the dialog is open in the browser, so reading storage here is safe.
  const [facing, setFacing] = useState<Facing>(savedFacing);
  // Always the latest callback, without restarting the camera when it changes.
  const latest = useRef(onRead);
  useEffect(() => {
    latest.current = onRead;
  });

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const last = { text: "", at: 0 };
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        // React mounts this twice in development; the first one is already
        // cancelled here, and must not start a camera the second one then
        // shares and stops.
        if (cancelled) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: facing } } },
          video.current!,
          (result) => {
            if (!result) return;
            const text = result.getText();
            const now = Date.now();
            if (text === last.text && now - last.at < REPEAT_MS) return;
            last.text = text;
            last.at = now;
            latest.current(text);
          },
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch {
        if (!cancelled) setError("Couldn't open the camera. Allow camera access for this site, or search below.");
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [facing]);

  if (error) return <Alert severity="warning">{error}</Alert>;
  return (
    <>
      <Box
        component="video"
        ref={video}
        muted
        playsInline
        aria-label="Camera"
        className="aspect-4/3 w-full object-cover"
        sx={{ bgcolor: "common.black", borderRadius: 2 }}
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const next: Facing = facing === "user" ? "environment" : "user";
            try {
              localStorage.setItem(FACING_KEY, next);
            } catch {
              // Storage blocked: it just starts on the back camera next time.
            }
            setFacing(next);
          }}
        >
          {facing === "user" ? "Use back camera" : "Use front camera"}
        </Button>
      </div>
    </>
  );
}
