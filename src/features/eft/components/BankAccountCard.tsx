import { getMyBankAccount } from "../queries";
import BankAccountPanel from "./BankAccountPanel";

// The member's "Monthly payments" card on /me/membership: their EFT bank account, with
// the way to add, change or remove it (#179).
export default async function BankAccountCard() {
  const account = await getMyBankAccount();
  return <BankAccountPanel account={account} />;
}
