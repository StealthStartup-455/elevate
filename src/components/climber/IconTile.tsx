import Box from "@mui/material/Box";

const TONE = {
  action: { bgcolor: "primary.soft", color: "primary.main" },
  ok: { bgcolor: "success.soft", color: "success.main" },
  warn: { bgcolor: "warning.soft", color: "warning.main" },
  bad: { bgcolor: "error.soft", color: "error.main" },
  neutral: { bgcolor: "background.subtle", color: "text.primary" },
} as const;

export type IconTone = keyof typeof TONE;

// A 44px rounded tile holding an icon, at the start of a list row (a set change, the waiver).
// Decorative: the row's text says what it is.
export default function IconTile({ tone = "neutral", children }: { tone?: IconTone; children: React.ReactNode }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        ...TONE[tone],
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Box>
  );
}
