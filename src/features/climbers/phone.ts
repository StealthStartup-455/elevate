// Phones are stored like +12505550101 (see the Climber table) and shown like
// 250-555-0101. Pure, so the seed script can use it too.

// "250-555-0101" or "(250) 555 0101" -> "+12505550101".
export function toStoredPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

// "+12505550101" -> "250-555-0101". Other numbers are shown as stored.
export function formatPhone(stored: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(stored);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : stored;
}
