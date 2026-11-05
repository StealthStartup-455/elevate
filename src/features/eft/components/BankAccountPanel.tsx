"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/features/climbers/format";
import { removeMyBankAccount, saveMyBankAccount } from "../actions";
import type { BankAccountSummary } from "../types";
import { BankAccountDialog, RemoveBankAccountDialog } from "./BankAccountDialogs";

// The member's own "Monthly payments" card on /me/membership.
export default function BankAccountPanel({ account: initial }: { account: BankAccountSummary | null }) {
  // Shown at once after a save or remove, before the page refreshes.
  const [account, setAccount] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography variant="cardTitle">Monthly payments</Typography>
          {account ? <StatusPill status="ok" label="EFT on file" /> : null}
        </div>
        <Typography variant="secondary">
          Pay a monthly membership by EFT (pre-authorized debit) from your bank account. This is a demo: no money is
          ever taken.
        </Typography>

        {account ? (
          <div>
            <Typography variant="body" sx={{ fontWeight: 600 }}>
              {account.label}
            </Typography>
            <Typography variant="secondary">
              {account.holderName} · Transit {account.transitNumber} · Added {formatDate(account.updatedOn, true)}
            </Typography>
          </div>
        ) : (
          <Typography variant="body">No bank account on file.</Typography>
        )}

        <div className="flex flex-wrap gap-2">
          {account ? (
            <>
              <Button variant="outlined" onClick={() => setEditing(true)}>
                Change bank account
              </Button>
              <Button variant="outlined" color="error" onClick={() => setRemoving(true)}>
                Remove
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => setEditing(true)}>
              Add bank account
            </Button>
          )}
        </div>
      </CardContent>

      {editing ? (
        <BankAccountDialog
          replacing={account !== null}
          save={saveMyBankAccount}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setAccount(saved);
            setEditing(false);
          }}
        />
      ) : null}
      {removing && account ? (
        <RemoveBankAccountDialog
          account={account}
          remove={removeMyBankAccount}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            setAccount(null);
            setRemoving(false);
          }}
        />
      ) : null}
    </Card>
  );
}

