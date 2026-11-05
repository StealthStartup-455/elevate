import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ClimberCard from "./ClimberCard";

type Props = {
  /** The amber tag: "In 12 days", "Competition · Tomorrow". */
  tag: string;
  title: string;
  /** "Sat, Nov 14 · 10 AM – 6 PM". */
  when: string;
  details?: string | null;
  /** A link under it, like "See all events". */
  children?: React.ReactNode;
  testId?: string;
};

// The dark announcement card: the one thing on Home that should catch the eye, an event coming
// up. Use it once per screen at most.
export default function Announcement({ tag, title, when, details, children, testId }: Props) {
  return (
    <ClimberCard tone="inverse" label="Coming up" testId={testId}>
      <Box
        component="span"
        sx={{
          alignSelf: "flex-start",
          bgcolor: "highlight.bg",
          color: "highlight.text",
          typography: "label",
          px: 2.5,
          py: 1,
          borderRadius: 999,
        }}
      >
        {tag}
      </Box>
      <div className="flex flex-col gap-1">
        <Typography variant="cardTitle" sx={{ fontSize: "1.375rem" }}>
          {title}
        </Typography>
        <Typography variant="body" sx={{ color: "inverse.muted" }}>
          {when}
        </Typography>
        {details ? (
          <Typography variant="secondary" sx={{ color: "inverse.muted" }}>
            {details}
          </Typography>
        ) : null}
      </div>
      {children}
    </ClimberCard>
  );
}
