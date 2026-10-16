import Box from "@mui/material/Box";

// The Elevate logo. Each part is a transparent PNG in public/brand used as a mask, so it is
// painted with theme colors and follows light and dark mode. The mountain is the one place
// teal appears outside an action: it is the brand color, not a button.
//   inline: mountain beside "elevate", for nav bars. `size` is its height in px.
//   full:   mountain, "elevate" and "CLIMBING GYM CRM" stacked, as in the original artwork.
//           `size` is its width in px.

// Width / height of each mask image, so parts keep their shape at any size.
const parts = {
  mark: { src: "/brand/mark.png", width: 533, height: 276 },
  wordmark: { src: "/brand/wordmark.png", width: 975, height: 202 },
  tagline: { src: "/brand/tagline.png", width: 836, height: 43 },
} as const;

function Part({
  part,
  color,
  sx,
}: {
  part: keyof typeof parts;
  color: string;
  sx: Record<string, unknown>;
}) {
  const { src, width, height } = parts[part];
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <Box
      aria-hidden="true"
      sx={{ flexShrink: 0, aspectRatio: `${width} / ${height}`, bgcolor: color, mask, WebkitMask: mask, ...sx }}
    />
  );
}

export default function Logo({ variant = "inline", size }: { variant?: "inline" | "full"; size?: number }) {
  if (variant === "full") {
    // Spacing and widths are fractions of the wordmark's width, measured from the artwork.
    const wordmarkWidth = parts.wordmark.width;
    return (
      <Box
        role="img"
        aria-label="Elevate, climbing gym CRM"
        sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: size ?? 240, maxWidth: "100%" }}
      >
        <Part part="mark" color="primary.main" sx={{ width: `${(parts.mark.width / wordmarkWidth) * 100}%` }} />
        <Part part="wordmark" color="text.primary" sx={{ width: "100%", mt: `${(43 / wordmarkWidth) * 100}%` }} />
        <Part
          part="tagline"
          color="text.primary"
          sx={{ width: `${(parts.tagline.width / wordmarkWidth) * 100}%`, mt: `${(55 / wordmarkWidth) * 100}%` }}
        />
      </Box>
    );
  }

  // The box's bottom edge is the wordmark's baseline, so in a nav with `items-baseline` the
  // letters sit on the same line as the link text.
  const height = size ?? 20;
  return (
    <Box role="img" aria-label="Elevate" sx={{ display: "inline-flex", alignItems: "flex-end", gap: height / 12 }}>
      <Part part="mark" color="primary.main" sx={{ height }} />
      <Part part="wordmark" color="text.primary" sx={{ height: height * 0.8 }} />
    </Box>
  );
}
