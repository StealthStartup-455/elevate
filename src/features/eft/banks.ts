// Canadian bank institution numbers, the three digits on a cheque between
// the branch (transit) number and the account number. Only the banks most
// climbers use; any other number shows as "Bank 123".
const BANKS: Record<string, string> = {
  "001": "BMO",
  "002": "Scotiabank",
  "003": "RBC",
  "004": "TD",
  "006": "National Bank",
  "010": "CIBC",
  "016": "HSBC",
  "039": "Laurentian Bank",
  "219": "ATB Financial",
  "614": "Tangerine",
  "621": "Peoples Trust",
  "815": "Desjardins",
  "828": "Coast Capital / credit union",
  "837": "Meridian",
};

export function bankName(institutionNumber: string): string {
  return BANKS[institutionNumber] ?? `Bank ${institutionNumber}`;
}

/** "RBC ••••1234": the bank and the last four digits, never the whole number. */
export function accountLabel(institutionNumber: string, last4: string): string {
  return `${bankName(institutionNumber)} ••••${last4}`;
}
