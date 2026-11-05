"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { joinGym, openJoinedGym, searchGyms } from "../actions";
import type { GymSearchResult } from "../queries";

export default function GymSearch({ initialGyms }: { initialGyms: GymSearchResult[] }) {
  const [gyms, setGyms] = useState(initialGyms);
  const [pending, startTransition] = useTransition();

  function updateSearch(value: string) {
    startTransition(async () => setGyms(await searchGyms(value)));
  }

  return (
    <Box>
      <TextField
        label="Search gyms"
        type="search"
        fullWidth
        onChange={(event) => updateSearch(event.target.value)}
        slotProps={{ htmlInput: { autoComplete: "off" } }}
      />
      {pending ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress size={24} aria-label="Searching gyms" />
        </Box>
      ) : (
        <List disablePadding sx={{ mt: 2 }}>
          {gyms.map((gym) => (
            <ListItem key={gym.id} disablePadding divider sx={{ width: "100%" }}>
              <Box
                component="form"
                action={
                  gym.joinedClimberId
                    ? openJoinedGym.bind(null, gym.joinedClimberId)
                    : joinGym.bind(null, gym.slug)
                }
                sx={{ flex: 1, width: "100%" }}
              >
                <ListItemButton component="button" type="submit" sx={{ width: "100%" }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography variant="body">{gym.name}</Typography>
                        {gym.joinedClimberId ? <StatusPill status="ok" label="Joined" /> : null}
                      </Box>
                    }
                  />
                </ListItemButton>
              </Box>
            </ListItem>
          ))}
          {gyms.length === 0 ? (
            <Typography variant="secondary" sx={{ p: 2 }}>
              No gyms match that search.
            </Typography>
          ) : null}
        </List>
      )}
    </Box>
  );
}
