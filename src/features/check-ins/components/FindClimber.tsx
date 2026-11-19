"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { findClimbersToCheckIn } from "@/features/climbers/actions";
import type { CheckInCandidate } from "@/features/climbers/types";
import { useClimberPanel } from "./ClimberPanel";

const SEARCH_DELAY_MS = 200;

// "Find climber" in the Check-in toolbar: the same server search as Manual
// check in (#85), so the page never carries every climber. Picking someone
// opens their panel (#169), or their page where there is no panel.
export default function FindClimber() {
  const router = useRouter();
  const panel = useClimberPanel();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckInCandidate[]>([]);
  // The query the current results are for, so "No climbers found" only shows
  // once the search for what was typed has answered.
  const [resultsFor, setResultsFor] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q === "") return;
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const found = await findClimbersToCheckIn(q);
        if (current) {
          setResults(found);
          setResultsFor(q);
          setFailed(false);
        }
      } catch {
        if (current) setFailed(true);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();
  const searched = q !== "" && resultsFor === q;

  return (
    <div className="flex w-full max-w-narrow items-center gap-2">
      <Typography variant="body" component="label" htmlFor="find-climber" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
        Find climber
      </Typography>
      <Autocomplete
        id="find-climber"
        className="w-full"
        options={q === "" ? [] : results}
        // The server already matched and ranked them, typos included.
        filterOptions={(options) => options}
        getOptionLabel={(c) => c.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        inputValue={query}
        onInputChange={(_, value, reason) => {
          if (reason !== "reset") setQuery(value);
        }}
        onChange={(_, climber) => {
          if (!climber) return;
          if (panel) panel.openClimber(climber.id);
          else router.push(`/desk/customers/${climber.id}`);
        }}
        loading={q !== "" && !searched && !failed}
        loadingText="Searching..."
        noOptionsText={
          failed ? "Couldn't search. Try again." : q === "" ? "Type a name or phone number" : "No climbers found"
        }
        renderOption={({ key, ...props }, c) => (
          <li key={key} {...props}>
            <div className="flex w-full items-baseline justify-between gap-3">
              <Typography variant="body" component="span">
                {c.name}
              </Typography>
              <Typography variant="secondary" component="span">
                {c.phone}
              </Typography>
            </div>
          </li>
        )}
        renderInput={(params) => <TextField {...params} type="search" placeholder="Name or phone" />}
      />
    </div>
  );
}
