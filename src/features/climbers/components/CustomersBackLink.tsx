import { Suspense } from "react";
import LinkButton from "./LinkButton";

// The back link on a customer page ("New customer" and a climber's page): "←
// Check-in" when staff came from the Check-in tab (?from=check-in), else "←
// Customers". Wrapped in Suspense for the page's searchParams.
function CustomersLink() {
  return (
    <LinkButton href="/desk/customers" variant="text">
      ← Customers
    </LinkButton>
  );
}

async function Link({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { from } = await searchParams;
  return from === "check-in" ? (
    <LinkButton href="/desk" variant="text">
      ← Check-in
    </LinkButton>
  ) : (
    <CustomersLink />
  );
}

export default function CustomersBackLink({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<CustomersLink />}>
      <Link searchParams={searchParams} />
    </Suspense>
  );
}
