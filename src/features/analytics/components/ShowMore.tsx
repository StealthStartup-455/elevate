"use client";

import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import { useState } from "react";

// Hides secondary content behind a toggle. The children are rendered on
// the server; this only shows or hides them.
export default function ShowMore({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="small"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        sx={{ textTransform: "none", px: 0, mt: 2, fontWeight: 600 }}
      >
        {open ? "Hide" : label} {open ? "▴" : "▾"}
      </Button>
      <Collapse in={open}>{children}</Collapse>
    </>
  );
}
