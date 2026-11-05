"use client";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState, useTransition } from "react";
import DeskButton from "@/components/ui/DeskButton";
import { switchGym } from "../actions";
import type { JoinedGym } from "../queries";

export default function GymSwitcher({
  gyms,
  activeClimberId,
}: {
  gyms: JoinedGym[];
  activeClimberId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const activeGym = gyms.find((gym) => gym.climberId === activeClimberId);

  return (
    <>
      <DeskButton
        aria-controls={anchor ? "gym-switcher-menu" : undefined}
        aria-expanded={anchor ? "true" : undefined}
        aria-haspopup="menu"
        disabled={pending}
        onClick={(event) => setAnchor(event.currentTarget)}
        size="small"
        variant="outlined"
        color="primary"
        endIcon={<span aria-hidden="true">▾</span>}
      >
        {activeGym?.name ?? "Choose gym"}
      </DeskButton>
      <Menu
        anchorEl={anchor}
        id="gym-switcher-menu"
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
      >
        {gyms.map((gym) => (
          <MenuItem
            key={gym.climberId}
            onClick={() => {
              setAnchor(null);
              if (gym.climberId !== activeClimberId) {
                startTransition(() => switchGym(gym.climberId));
              }
            }}
            selected={gym.climberId === activeClimberId}
          >
            {gym.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
