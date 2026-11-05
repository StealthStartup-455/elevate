import DeskButton from "@/components/ui/DeskButton";
import { logout } from "../actions";

// Top right of the signed-in layouts (/me and /desk).
export default function LogoutButton() {
  return (
    <form action={logout} className="ml-auto">
      <DeskButton type="submit" variant="outlined" size="small" color="primary">
        Log out
      </DeskButton>
    </form>
  );
}
