"use client";

import { useColorScheme } from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

type Mode = "light" | "system" | "dark";

// Light / system / dark switch. The choice is saved in the browser and applied before the
// first paint by InitColorSchemeScript in the root layout.
export default function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();
  return (
    <ToggleButtonGroup
      exclusive
      value={mode ?? null}
      onChange={(_, next: Mode | null) => next && setMode(next)}
      aria-label="Color theme"
    >
      <ToggleButton value="light">Light</ToggleButton>
      <ToggleButton value="system">System</ToggleButton>
      <ToggleButton value="dark">Dark</ToggleButton>
    </ToggleButtonGroup>
  );
}
