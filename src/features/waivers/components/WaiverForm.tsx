"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState } from "react";
import { formatDate } from "@/features/climbers/format";
import { signWaiver, type WaiverFormState } from "../actions";
import type { WaiverTemplateView } from "../queries";

type Props = {
  template: WaiverTemplateView;
  climber: { id: string; fullName: string; dateOfBirth: string; isMinor: boolean };
  /** They signed before, but it ran out or the gym changed the wording. */
  expired: boolean;
};

// The customer signs the gym's waiver: read it, tick each rule, (a parent or
// guardian for a minor), type their name, agree it's their signature. One
// form, so it works without JavaScript and on any phone.
export default function WaiverForm({ template, climber, expired }: Props) {
  const [state, formAction, pending] = useActionState<WaiverFormState, FormData>(signWaiver, {
    status: "idle",
  });
  const errors = state.errors ?? {};
  // After an error React resets the form, so the fields start from what was
  // entered.
  const values = state.values;

  // On success the action refreshes the page, which then shows "You're all
  // set" instead of this form (app/me/waiver/page.tsx).

  return (
    <Box
      component="form"
      action={formAction}
      noValidate
      className="flex flex-col gap-3"
      // A new key after each failed try remounts the fields, so their
      // defaults (what was entered) apply again.
      key={values ? JSON.stringify(values) : "empty"}
    >
      <input type="hidden" name="climberId" value={climber.id} />
      <input type="hidden" name="templateVersion" value={template.version} />

      {expired ? (
        <Alert severity="warning">
          Your waiver has expired or the gym has updated it. Please read and sign it again.
        </Alert>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">{template.title}</Typography>
          <Typography variant="secondary">Version {template.version}</Typography>
          {template.paragraphs.map((paragraph, i) => (
            <Typography key={i} variant="body">
              {paragraph}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Who is climbing</Typography>
          <Typography variant="body">{climber.fullName}</Typography>
          <Typography variant="secondary">Born {formatDate(climber.dateOfBirth, true)}</Typography>
          {climber.isMinor ? (
            <>
              <Alert severity="info">
                {climber.fullName} is under 19, so a parent or guardian must sign.
              </Alert>
              <TextField
                name="guardianName"
                label="Parent or guardian's full name"
                required
                fullWidth
                defaultValue={values?.guardianName}
                error={Boolean(errors.guardianName)}
                helperText={errors.guardianName}
                slotProps={{ htmlInput: { autoComplete: "name" } }}
              />
              <FormControl error={Boolean(errors.signerRelation)} required>
                <FormLabel id="signer-relation-label">You are their</FormLabel>
                <RadioGroup
                  row
                  name="signerRelation"
                  aria-labelledby="signer-relation-label"
                  defaultValue={values?.signerRelation || undefined}
                >
                  <FormControlLabel value="PARENT" control={<Radio />} label="Parent" />
                  <FormControlLabel value="GUARDIAN" control={<Radio />} label="Legal guardian" />
                </RadioGroup>
                {errors.signerRelation ? (
                  <FormHelperText>{errors.signerRelation}</FormHelperText>
                ) : null}
              </FormControl>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <FormControl component="fieldset" error={Boolean(errors.clauses)} required>
            <FormLabel component="legend">
              <Typography variant="cardTitle" component="span">
                Tick each rule to agree
              </Typography>
            </FormLabel>
            <FormGroup className="mt-2">
              {template.clauses.map((clause, i) => (
                <FormControlLabel
                  key={i}
                  control={
                    <Checkbox
                      name="clause"
                      value={String(i)}
                      defaultChecked={values?.clauses.includes(String(i))}
                    />
                  }
                  label={clause}
                />
              ))}
            </FormGroup>
            {errors.clauses ? <FormHelperText>{errors.clauses}</FormHelperText> : null}
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Typography variant="cardTitle">Sign</Typography>
          <TextField
            name="signatureText"
            label={climber.isMinor ? "Parent or guardian: type your full name" : "Type your full name"}
            required
            fullWidth
            defaultValue={values?.signatureText}
            error={Boolean(errors.signatureText)}
            helperText={
              errors.signatureText ??
              (climber.isMinor ? undefined : `As shown above: ${climber.fullName}`)
            }
            slotProps={{ htmlInput: { autoComplete: "name" } }}
          />
          <FormControl error={Boolean(errors.agree)} required>
            <FormControlLabel
              control={<Checkbox name="agree" defaultChecked={values?.agree} />}
              label="I agree that typing my name is my electronic signature, and that I signed this waiver today."
            />
            {errors.agree ? <FormHelperText>{errors.agree}</FormHelperText> : null}
          </FormControl>

          {state.status === "error" && state.message ? (
            <Alert severity="error">{state.message}</Alert>
          ) : null}

          <Button type="submit" variant="contained" size="large" disabled={pending}>
            {pending ? "Signing…" : "Sign waiver"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
