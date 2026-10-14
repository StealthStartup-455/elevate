import Button from "@mui/material/Button";
import { logout } from "../actions";

// Top right of the signed-in layouts (/me and /desk).
export default function LogoutButton() {
  return (
    <form action={logout} className="ml-auto">
      <Button type="submit" variant="outlined" size="small">
        Log out
      </Button>
    </form>
  );
}
