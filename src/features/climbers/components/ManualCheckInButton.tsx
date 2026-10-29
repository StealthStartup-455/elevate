import ManualCheckIn from "./ManualCheckIn";

// The desk's manual check in button. It used to load every climber here for
// the dialog's search; the dialog now searches on the server as staff type
// (#85), so the page carries no climber list.
export default function ManualCheckInButton() {
  return <ManualCheckIn />;
}
