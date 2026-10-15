"use client";

import Tooltip from "@mui/material/Tooltip";

// Wrap a disabled control to say why it's disabled. Disabled MUI buttons ignore the mouse
// and keyboard, so the wrapper takes the hover and focus instead.
//
//   <DisabledReason reason="No waivers expire in the next 7 days">
//     <Button variant="outlined" disabled>Send reminders</Button>
//   </DisabledReason>
export default function DisabledReason({ reason, children }: { reason: string; children: React.ReactElement }) {
  return (
    <Tooltip title={reason} describeChild>
      <span
        tabIndex={0}
        className="inline-flex cursor-not-allowed rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav"
      >
        {children}
      </span>
    </Tooltip>
  );
}
