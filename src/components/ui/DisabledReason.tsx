"use client";

import Tooltip from "@mui/material/Tooltip";

// Wrap a disabled control to say why it's disabled. Disabled MUI buttons ignore the mouse
// and keyboard, so the wrapper takes the hover and focus instead.
//
//   <DisabledReason reason="No waivers expire in the next 7 days">
//     <Button variant="outlined" disabled>Send reminders</Button>
//   </DisabledReason>
//
// `fullWidth` stretches the wrapper (and a fullWidth child) across its column.
export default function DisabledReason({
  reason,
  fullWidth = false,
  children,
}: {
  reason: string;
  fullWidth?: boolean;
  children: React.ReactElement;
}) {
  return (
    <Tooltip title={reason} describeChild>
      <span
        tabIndex={0}
        className={`${fullWidth ? "flex w-full" : "inline-flex"} cursor-not-allowed rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav`}
      >
        {children}
      </span>
    </Tooltip>
  );
}
