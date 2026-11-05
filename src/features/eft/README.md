# eft

A member's bank account for EFT (pre-authorized debit) of their monthly membership (#179). **A mock:** nothing is sent to a bank or payment processor and nothing is ever debited. The desk still rings up each month under "Renewals due" on the POS. Real payments are #31.

**Owner:** _TBD_

## What it does

- **Member, `/me`:** the "Monthly payments" card shows the account on file ("RBC ••••7890", name, transit, date added) or "No bank account on file". **Add bank account** opens a form (name, transit, institution and account number, and a box agreeing to the debit). **Change bank account** replaces it; **Remove** deletes it after a confirm.
- **Desk, POS climber card and customer page (`/desk/customers/[id]`):** "EFT on file: RBC ••••7890" with **Change** and **Remove**, or "No EFT bank account on file" with **Add bank account**, for a member who gives their details at the front desk. The customer page also shows the name on the account and the transit number. The Renewals due rows add "· EFT on file".

## What is stored (`BankAccount`)

One row per climber: name on the account, institution number (3 digits), transit number (5 digits), the **last four digits** of the account number, and a made-up token (`mock_eft_<uuid>`) standing in for the one a processor would give back. The full account number is checked, cut to its last four and dropped: it is never saved or logged. Removing deletes the row, and deleting a climber deletes their account.

## Folder shape

```
features/eft/
├── actions.ts     # saveMyBankAccount, removeMyBankAccount (session's climber); saveClimberBankAccount, removeClimberBankAccount (staff)
├── queries.ts     # getMyBankAccount, getBankAccountForStaff, getBankAccount (by gym), climbersWithBankAccount
├── validate.ts    # Canadian account number rules
├── banks.ts       # institution number to bank name, "RBC ••••1234"
├── types.ts
└── components/    # BankAccountPanel (member, /me), DeskBankAccount (POS, customer page), BankAccountDialogs (shared)
```

The member's actions take the climber from the session, never from the request. The desk's actions and `getBankAccountForStaff` check for staff (`requireStaff`) and reach only a climber of the staff member's own gym (`getClimber`, #34). The POS reads the account through `getPosClimber`. Every save and remove is logged with `source` (`member` or `desk`), never the details.
