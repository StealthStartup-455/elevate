"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState } from "react";
import LinkArrow from "@/components/ui/LinkArrow";
import { publishWaiver, type WordingFormState } from "../actions";
import { MAX_CLAUSES } from "../wording";

type Props = {
  /** The wording to start from: the current version, or empty for a gym's first waiver. */
  initial: { title: string; body: string; clauses: string[] };
  /** The version the editor opened on ("" if none), so a stale edit is refused. */
  baseVersion: string;
  /** What publishing creates, e.g. "v2". */
  nextVersion: string;
};

// A manager writes the gym's waiver (#110): title, text and the rules climbers
// tick. Publishing never edits a version; it adds the next one, and the action
// sends the manager back to the Waivers page.
export default function WaiverEditor({ initial, baseVersion, nextVersion }: Props) {
  const [state, formAction, pending] = useActionState<WordingFormState, FormData>(publishWaiver, {
    status: "idle",
  });
  const errors = state.errors ?? {};
  const values = state.values ?? {
    title: initial.title,
    body: initial.body,
    clauses: initial.clauses.join("\n"),
    confirm: false,
  };

  return (
    <Box
      component="form"
      action={formAction}
      noValidate
      className="flex flex-col gap-3"
      // React resets a form after its action runs; a new key after each failed
      // try remounts the fields with what was typed.
      key={state.values ? JSON.stringify(state.values) : "initial"}
    >
      <input type="hidden" name="baseVersion" value={baseVersion} />

      {state.status === "error" && state.message ? <Alert severity="error">{state.message}</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="cardTitle">Waiver text</Typography>
          <TextField
            name="title"
            label="Title"
            defaultValue={values.title}
            required
            error={!!errors.title}
            helperText={errors.title}
          />
          <TextField
            name="body"
            label="Text"
            defaultValue={values.body}
            required
            multiline
            minRows={10}
            error={!!errors.body}
            helperText={errors.body ?? "Leave a blank line between paragraphs."}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="cardTitle">Rules climbers tick</Typography>
          <TextField
            name="clauses"
            label="Rules"
            defaultValue={values.clauses}
            multiline
            minRows={4}
            error={!!errors.clauses}
            helperText={
              errors.clauses ??
              `One rule per line, up to ${MAX_CLAUSES}. Climbers tick each one before they sign. Leave empty for none.`
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="cardTitle">Publish</Typography>
          <Alert severity="warning">
            Publishing creates version {nextVersion}. Every climber, even one whose waiver is still valid,
            must sign the new wording before they can check in. Waivers already signed stay as they were.
          </Alert>
          <FormControl error={!!errors.confirm}>
            <FormControlLabel
              control={<Checkbox name="confirm" defaultChecked={values.confirm} />}
              label="I understand every climber will have to sign again."
            />
            {errors.confirm ? <FormHelperText>{errors.confirm}</FormHelperText> : null}
          </FormControl>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="contained" disabled={pending}>
              {pending ? "Publishing…" : `Publish ${nextVersion}`}
            </Button>
            <LinkArrow href="/desk/waivers">Back to waivers</LinkArrow>
          </div>
        </CardContent>
      </Card>
    </Box>
  );
}
