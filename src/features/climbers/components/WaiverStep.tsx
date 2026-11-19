import Stack from "@mui/material/Stack";
import LinkButton from "./LinkButton";

type Props = {
  climberId: string;
  /** Show a Later button to this page, to skip signing for now. */
  laterHref?: string;
};

// The desk climber page's way to a waiver: opens the real signing form with
// the climber (#210). It used to save a "signed" waiver in one click; climbers
// sign the same form themselves on /me/waiver.
export default function WaiverStep({ climberId, laterHref }: Props) {
  return (
    <Stack spacing={3}>
      <LinkButton href={`/desk/customers/${climberId}/waiver`} size="large">
        Sign a waiver now
      </LinkButton>
      {laterHref ? (
        <LinkButton href={laterHref} variant="outlined" size="large">
          Later
        </LinkButton>
      ) : null}
    </Stack>
  );
}
