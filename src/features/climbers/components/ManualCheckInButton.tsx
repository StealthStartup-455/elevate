import { listClimbers } from "../queries";
import ManualCheckIn from "./ManualCheckIn";

// Loads the climbers for the dialog on the server, so searching is instant.
export default async function ManualCheckInButton() {
  const climbers = await listClimbers();
  return (
    <ManualCheckIn
      climbers={climbers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phone,
        waiverStatus: c.waiverStatus,
        waiverExpiresOn: c.waiverExpiresOn,
        membershipStatus: c.membershipStatus,
        membershipRenewsOn: c.membershipRenewsOn,
        hasDayPass: c.hasDayPass,
        punchesLeft: c.punchesLeft,
      }))}
    />
  );
}
