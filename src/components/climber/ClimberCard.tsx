import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type Props = {
  /** The card's heading (cardTitle). Leave it out for a card that is all content. */
  title?: string;
  /** Something on the right of the heading: a link, a tag. */
  action?: React.ReactNode;
  /** Names the section for screen readers when there's no title. */
  label?: string;
  /** `brand` is the teal plan card; `inverse` the dark announcement card. */
  tone?: "plain" | "brand" | "inverse";
  children: React.ReactNode;
  testId?: string;
};

const TONE = {
  plain: { bgcolor: "background.paper", color: "text.primary" },
  brand: { bgcolor: "primary.main", color: "primary.contrastText" },
  inverse: { bgcolor: "inverse.bg", color: "inverse.text" },
} as const;

// A card on a climber tab: white on the grey ground, 20px corners and padding, no border.
// Its children stack with a 12px gap.
export default function ClimberCard({ title, action, label, tone = "plain", children, testId }: Props) {
  return (
    <Box
      component="section"
      aria-label={title ? undefined : label}
      data-testid={testId}
      sx={{ ...TONE[tone], borderRadius: 5, p: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <Typography variant="cardTitle">{title}</Typography>
          {action}
        </div>
      ) : null}
      {children}
    </Box>
  );
}
