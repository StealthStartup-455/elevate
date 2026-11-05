import Typography from "@mui/material/Typography";
import ClimberCard from "@/components/climber/ClimberCard";
import { getMyClasses } from "../queries";
import ClassList from "./ClassList";

// Classes in the next two weeks, with sign up and cancel. Free for now.
export default async function Classes() {
  const classes = await getMyClasses();
  return (
    <div className="flex flex-col gap-3">
      <Typography variant="secondary">Free to join. The next two weeks.</Typography>
      {classes.length === 0 ? (
        <ClimberCard label="Classes">
          <Typography variant="body">No classes in the next two weeks. Check back soon.</Typography>
        </ClimberCard>
      ) : (
        <ClassList classes={classes} />
      )}
    </div>
  );
}
