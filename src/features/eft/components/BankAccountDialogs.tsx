"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import type { BankAccountField, BankAccountInput, BankAccountResult, BankAccountSummary } from "../types";

// The Add / Change bank account form and the Remove confirm, shared by the
// member's card on /me/membership and the desk (POS card, customer page). The caller
// passes the server action to run. `climberName` set means the desk is
// filling it in for that climber, so the wording speaks about them.

const EMPTY: BankAccountInput = {
  holderName: "",
  transitNumber: "",
  institutionNumber: "",
  accountNumber: "",
  authorized: false,
};

export function BankAccountDialog({
  replacing,
  climberName,
  save,
  onClose,
  onSaved,
}: {
  replacing: boolean;
  climberName?: string;
  save: (input: BankAccountInput) => Promise<BankAccountResult>;
  onClose: () => void;
  onSaved: (account: BankAccountSummary) => void;
}) {
  // Hold the desk's scan popup while this is open (#92, #127); nothing on /me.
  useDeskDialogOpen(true);
  const [form, setForm] = useState<BankAccountInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<BankAccountField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (field: keyof BankAccountInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: field === "authorized" ? e.target.checked : e.target.value }));

  function close() {
    if (!pending) onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await save(form);
        if (result.ok && result.account) onSaved(result.account);
        else if (!result.ok) {
          setErrors(result.errors ?? {});
          setMessage(result.message);
        }
      } catch {
        setMessage("Couldn't save the bank account. Try again.");
      }
    });
  }

  const field = (name: Exclude<BankAccountField, "authorized">, label: string, extra: object = {}) => (
    <TextField
      label={label}
      value={form[name]}
      onChange={set(name)}
      error={!!errors[name]}
      helperText={errors[name]}
      disabled={pending}
      fullWidth
      required
      {...extra}
    />
  );

  return (
    <Dialog open onClose={close} fullWidth maxWidth="xs" aria-labelledby="bank-account-title">
      <form onSubmit={submit} noValidate>
        <DialogTitle id="bank-account-title">{replacing ? "Change bank account" : "Add bank account"}</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <Typography variant="secondary">
            {climberName
              ? `For ${climberName}. The numbers are on their void cheque or banking app.`
              : "The numbers are on a void cheque or in your banking app."}{" "}
            Only the last four digits of the account number are kept.
          </Typography>
          {field("holderName", "Name on the account", { autoComplete: "name" })}
          <div className="grid grid-cols-2 gap-3">
            {field("transitNumber", "Transit number", { inputMode: "numeric", placeholder: "01234" })}
            {field("institutionNumber", "Institution number", { inputMode: "numeric", placeholder: "003" })}
          </div>
          {field("accountNumber", "Account number", { inputMode: "numeric", autoComplete: "off" })}
          <div>
            <FormControlLabel
              control={<Checkbox checked={form.authorized} onChange={set("authorized")} disabled={pending} />}
              label={
                <Typography variant="body">
                  {climberName
                    ? `${climberName} agrees to a monthly debit from this account for their membership, until it is removed.`
                    : "I authorize the gym to debit this account each month for my monthly membership, until I remove it."}
                </Typography>
              }
            />
            {errors.authorized ? <FormHelperText error>{errors.authorized}</FormHelperText> : null}
          </div>
          {message ? <Alert severity="error">{message}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={pending} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? "Saving…" : "Save bank account"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function RemoveBankAccountDialog({
  account,
  climberName,
  remove,
  onClose,
  onRemoved,
}: {
  account: BankAccountSummary;
  climberName?: string;
  remove: () => Promise<BankAccountResult>;
  onClose: () => void;
  onRemoved: () => void;
}) {
  useDeskDialogOpen(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await remove();
        if (result.ok) onRemoved();
        else setError(result.message);
      } catch {
        setError("Couldn't remove the bank account. Try again.");
      }
    });
  }

  return (
    <Dialog open onClose={() => !pending && onClose()} fullWidth maxWidth="xs" aria-labelledby="remove-bank-title">
      <DialogTitle id="remove-bank-title">Remove bank account</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        <Typography variant="body">
          Remove {account.label}
          {climberName ? ` from ${climberName}'s account` : ""}?
        </Typography>
        <Typography variant="secondary">
          {climberName
            ? "Their membership stays as it is. Ring up the next month on the POS."
            : "Your membership stays as it is. Pay the next month at the front desk, or add a bank account again."}
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button disabled={pending} onClick={onClose}>
          Keep it
        </Button>
        <Button variant="contained" color="error" disabled={pending} onClick={confirm}>
          {pending ? "Removing…" : "Remove bank account"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
