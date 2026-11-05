"use client";

import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { removeClimberBankAccount, saveClimberBankAccount } from "../actions";
import type { BankAccountSummary } from "../types";
import { BankAccountDialog, RemoveBankAccountDialog } from "./BankAccountDialogs";

// A climber's EFT bank account at the desk: on the POS climber card and the
// customer page. Staff can add one for a member who gives their details at
// the front desk, change it or remove it (#179). A mock: nothing is debited.
export default function DeskBankAccount({
  climberId,
  climberName,
  account: initial,
  detailed = false,
  onChanged,
}: {
  climberId: string;
  climberName: string;
  account: BankAccountSummary | null;
  /** The customer page also shows the name on the account and the transit number. */
  detailed?: boolean;
  /** After a save or remove, for a caller that reloads the climber (the POS). */
  onChanged?: () => void;
}) {
  // Shown at once, before the page or climber card reloads.
  const [account, setAccount] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Typography variant="secondary" component="span">
          {account ? `EFT on file: ${account.label}` : "No EFT bank account on file"}
        </Typography>
        {account ? (
          <>
            <Button variant="outlined" size="small" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={() => setRemoving(true)}>
              Remove
            </Button>
          </>
        ) : (
          <Button variant="outlined" size="small" onClick={() => setEditing(true)}>
            Add bank account
          </Button>
        )}
      </div>
      {detailed && account ? (
        <Typography variant="secondary">
          {account.holderName} · Transit {account.transitNumber}
        </Typography>
      ) : null}

      {editing ? (
        <BankAccountDialog
          replacing={account !== null}
          climberName={climberName}
          save={(input) => saveClimberBankAccount(climberId, input)}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setAccount(saved);
            setEditing(false);
            onChanged?.();
          }}
        />
      ) : null}
      {removing && account ? (
        <RemoveBankAccountDialog
          account={account}
          climberName={climberName}
          remove={() => removeClimberBankAccount(climberId)}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            setAccount(null);
            setRemoving(false);
            onChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}
