"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormHelperText from "@mui/material/FormHelperText";
import Typography from "@mui/material/Typography";
import SignaturePadLib from "signature_pad";
import { useEffect, useId, useRef, useState } from "react";
import { colors } from "@/components/ui/theme/tokens";

// Paper colors in both themes: the saved PNG is a dark signature on white,
// so it reads the same on any screen and when printed.
const PAPER = colors.light.surface;
const INK = colors.light.text;

type Props = {
  /** The hidden field the PNG goes into. */
  name: string;
  label: string;
  error?: string;
  /** A signature to show again after a failed submit. */
  defaultValue?: string;
};

// A box to sign in with a finger or mouse (the signature_pad library). The
// drawing goes into a hidden form field as a PNG data URL, so the form
// submits it like any other field.
export default function SignaturePad({ name, label, error, defaultValue = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  // Controlled, so React's reset after a submit doesn't empty it.
  const [value, setValue] = useState(defaultValue);
  // The latest drawing as an image. Resizing a canvas wipes it, and a
  // signature restored from defaultValue has no strokes to replay, so a resize
  // redraws from this.
  const imageRef = useRef(defaultValue);
  const labelId = useId();
  const errorId = useId();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePadLib(canvas, { penColor: INK, backgroundColor: PAPER });
    padRef.current = pad;
    const save = () => {
      imageRef.current = pad.toDataURL("image/png");
      setValue(imageRef.current);
    };
    pad.addEventListener("endStroke", save);

    // Size the drawing surface to the box and the screen's pixel density, so
    // lines are sharp. Redraws what was there when the phone rotates.
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
      if (imageRef.current) {
        void pad.fromDataURL(imageRef.current, {
          width: canvas.offsetWidth,
          height: canvas.offsetHeight,
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      pad.removeEventListener("endStroke", save);
      pad.off();
    };
    // Set up once, on mount.
  }, []);

  return (
    <Box className="flex flex-col gap-1">
      <Typography id={labelId} variant="body" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Box
        component="canvas"
        ref={canvasRef}
        role="img"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="h-40 w-full"
        sx={{
          bgcolor: PAPER,
          border: 1,
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1,
          // Drawing mustn't scroll or zoom the page on a phone.
          touchAction: "none",
          cursor: "crosshair",
        }}
      />
      <input type="hidden" name={name} value={value} readOnly />
      <Box className="flex items-center justify-between gap-2">
        <Typography variant="secondary">
          {value ? "Signed" : "Sign with your finger or mouse"}
        </Typography>
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={() => {
            imageRef.current = "";
            padRef.current?.clear();
            setValue("");
          }}
        >
          Clear
        </Button>
      </Box>
      {error ? (
        <FormHelperText id={errorId} error>
          {error}
        </FormHelperText>
      ) : null}
    </Box>
  );
}
