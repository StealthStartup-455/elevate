import Button, { type ButtonProps } from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";
import { controlHeight, px, radius, space } from "./theme/tokens";

const touch = "@media (pointer: coarse)";

const deskButtonSx: SxProps<Theme> = {
  height: controlHeight.sm,
  minHeight: controlHeight.sm,
  padding: `0 ${space.stack}px`,
  borderRadius: radius.md,
  fontSize: px(12),
  fontWeight: 600,
  lineHeight: 1,
  [touch]: {
    height: controlHeight.lg,
    minHeight: controlHeight.lg,
  },
};

// Customer header controls use the desk's compact density on pointer devices,
// while touch devices retain the desk theme's 40px minimum target.
export default function DeskButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      sx={[deskButtonSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
