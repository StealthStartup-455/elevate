"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";

// A "?" that explains the thing next to it. Tooltips open on hover and on keyboard focus.
// Only for extra explanation: nothing essential may live only in a tooltip.
// The target is 24px (WCAG 2.2 minimum) around an 18px circle.
export default function HelpTip({ title, label }: { title: string; label: string }) {
  return (
    <Tooltip title={title} describeChild>
      <ButtonBase
        aria-label={label}
        sx={{
          width: 24,
          height: 24,
          verticalAlign: "middle",
          borderRadius: "50%",
          "& .dot": {
            display: "grid",
            placeItems: "center",
            width: 18,
            height: 18,
            borderRadius: "50%",
            bgcolor: "secondary.soft",
            color: "secondary.main",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            transition: "background-color 120ms, color 120ms",
          },
          "&:hover .dot, &.Mui-focusVisible .dot": { bgcolor: "secondary.main", color: "secondary.contrastText" },
        }}
      >
        <span className="dot" aria-hidden="true">
          ?
        </span>
      </ButtonBase>
    </Tooltip>
  );
}
