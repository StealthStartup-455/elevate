import Typography from "@mui/material/Typography";

// Shown at once while the next desk page loads, so a click in the nav bar
// always does something straight away (the Next.js "loading.js" convention).
export default function DeskLoading() {
  return (
    <Typography variant="secondary" role="status">
      Loading...
    </Typography>
  );
}
