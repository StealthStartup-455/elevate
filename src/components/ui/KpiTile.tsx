import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

const TONE = { up: "success.main", warn: "warning.main", bad: "error.main" } as const;

// A big number with a label. Not clickable, so it never reacts to hover. Put a link or a
// button in `children` if the number needs follow-up.
export default function KpiTile({
  label,
  value,
  detail,
  tone,
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: keyof typeof TONE;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5">
        <Typography variant="secondary">{label}</Typography>
        <Typography variant="kpi">{value}</Typography>
        {detail && (
          <Typography variant="secondary" sx={tone ? { color: TONE[tone] } : undefined}>
            {detail}
          </Typography>
        )}
        {children && <div className="mt-1 flex flex-wrap items-center gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}
