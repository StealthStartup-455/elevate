// The climber app's MUI theme (/me), built only from climber/tokens.ts. It nests inside the desk
// theme (ClimberTheme.tsx) with its own CSS variable prefix, `--climb-`, so the two never mix:
// MUI components under /me read climber values, everything else keeps the desk's.
// The six text style names are the desk's, at phone sizes. See STYLE_GUIDE.md, "Climber app".
import { createTheme, type Shadows, type ThemeOptions } from "@mui/material/styles";
import { breakpoints } from "../theme";
import { motion, px, type ColorScheme, type RoleColor, type StatusColor } from "../tokens";
import {
  climberColors,
  climberControl,
  climberFonts,
  climberRadius,
  climberSpace,
  climberText,
  type ClimberColors,
  type ClimberTextStyle,
} from "./tokens";

const ease = (...props: string[]) =>
  props.map((p) => `${p} ${motion.duration}ms ${motion.easing}`).join(", ");

function role(c: RoleColor) {
  return {
    main: c.main,
    light: c.main,
    dark: c.hover,
    pressed: c.pressed,
    contrastText: c.on,
    soft: c.soft,
    softHover: c.softHover,
    border: c.border,
  };
}

function status(c: StatusColor) {
  return {
    main: c.main,
    light: c.main,
    dark: c.main,
    pressed: c.main,
    contrastText: c.on,
    soft: c.soft,
    softHover: c.soft,
    border: c.soft,
  };
}

function palette(c: ClimberColors, scheme: ColorScheme) {
  return {
    mode: scheme,
    // One accent: teal is for actions and for where you are (the selected tab).
    primary: role(c.action),
    secondary: role(c.action),
    info: role(c.action),
    success: status(c.ok),
    warning: status(c.warn),
    error: status(c.bad),
    text: { primary: c.text, secondary: c.muted, disabled: c.disabled },
    background: { default: c.page, paper: c.surface, subtle: c.subtle },
    divider: c.line,
    action: {
      hover: c.hover,
      selected: c.hover,
      focus: c.hover,
      disabled: c.disabled,
      disabledBackground: c.subtle,
    },
    inverse: c.inverse,
    highlight: c.highlight,
    heat: c.heat,
    heatNow: c.heatNow,
    // The desk's palette has these; climber screens only use chart.
    sidebar: { bg: c.surface, text: c.text, muted: c.muted, active: c.subtle, activeText: c.text, mark: c.action.main },
    chart: { data: c.heat[1], now: c.heatNow, heat1: c.heat[1], heat2: c.heat[2], heat3: c.heat[3], heat4: c.heat[4] },
    floatShadow: c.floatShadow,
  };
}

function textStyle(t: ClimberTextStyle, withColor = true) {
  return {
    fontFamily: climberFonts.sans,
    fontSize: px(t.size),
    lineHeight: t.lineHeight,
    fontWeight: t.weight,
    letterSpacing: t.tracking ?? 0,
    ...(withColor && t.muted ? { color: "var(--climb-palette-text-secondary)" } : {}),
  };
}

const typography: ThemeOptions["typography"] = {
  fontFamily: climberFonts.sans,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  pageTitle: textStyle(climberText.pageTitle),
  cardTitle: textStyle(climberText.cardTitle),
  kpi: textStyle(climberText.kpi),
  body: textStyle(climberText.body),
  secondary: textStyle(climberText.secondary),
  label: textStyle(climberText.label),

  // MUI's built-in variants, so older climber screens and MUI's own components match.
  h1: textStyle(climberText.pageTitle),
  h2: textStyle(climberText.pageTitle),
  h3: textStyle(climberText.cardTitle),
  h4: textStyle(climberText.cardTitle),
  h5: textStyle(climberText.cardTitle),
  h6: textStyle(climberText.cardTitle),
  subtitle1: { ...textStyle(climberText.body), fontWeight: 700 },
  subtitle2: { ...textStyle(climberText.body), fontWeight: 700 },
  body1: textStyle(climberText.body),
  body2: textStyle(climberText.secondary, false),
  caption: textStyle(climberText.secondary, false),
  overline: textStyle(climberText.label, false),
  button: { fontFamily: climberFonts.sans, fontSize: px(17), fontWeight: 700, lineHeight: 1, textTransform: "none" },
};

// Flat cards on a grey ground; only dialogs and menus float.
const shadows = Array.from({ length: 25 }, (_, i) =>
  i < 6 ? "none" : "var(--climb-palette-floatShadow)",
) as Shadows;

const components: ThemeOptions["components"] = {
  MuiButtonBase: { defaultProps: { disableRipple: true } },

  MuiTypography: {
    defaultProps: {
      variantMapping: {
        pageTitle: "h1",
        cardTitle: "h2",
        kpi: "p",
        body: "p",
        secondary: "p",
        label: "span",
      },
    },
  },

  // contained = the main action (teal), outlined = a quiet action (white, bordered),
  // text = low emphasis. Every button is at least 48px tall.
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          minHeight: climberControl.md,
          minWidth: 0,
          padding: "0 18px",
          borderRadius: climberRadius.md,
          fontSize: px(17),
          fontWeight: 700,
          lineHeight: 1.2,
          textTransform: "none",
          boxShadow: "none",
          transition: ease("background-color", "border-color", "color"),
          "&:hover, &:active": { boxShadow: "none" },
          variants: [
            { props: { size: "small" }, style: { minHeight: climberControl.min, padding: "0 14px", fontSize: px(16) } },
            { props: { size: "large" }, style: { minHeight: climberControl.lg, padding: "0 22px", fontSize: px(18) } },
            ...(["primary", "error", "warning", "success"] as const).flatMap((color) => [
              {
                props: { variant: "contained" as const, color },
                style: {
                  "&:hover": { backgroundColor: p[color].dark },
                  "&:active": { backgroundColor: p[color].pressed },
                },
              },
              {
                props: { variant: "text" as const, color },
                style: { color: p[color].main, "&:hover": { backgroundColor: p[color].soft } },
              },
            ]),
            {
              props: { variant: "outlined" },
              style: {
                backgroundColor: p.background.paper,
                borderColor: p.divider,
                color: p.text.primary,
                "&:hover": { backgroundColor: p.background.subtle, borderColor: p.text.disabled },
              },
            },
            {
              props: { variant: "outlined", color: "primary" },
              style: {
                backgroundColor: p.primary.soft,
                borderColor: p.primary.border,
                color: p.primary.main,
                "&:hover": { backgroundColor: p.primary.softHover, borderColor: p.primary.main },
              },
            },
            {
              props: { variant: "outlined", color: "error" },
              style: { color: p.error.main, "&:hover": { backgroundColor: p.error.soft, borderColor: p.error.main } },
            },
            {
              props: { variant: "contained" },
              style: { "&.Mui-disabled": { backgroundColor: p.background.subtle, color: p.text.disabled } },
            },
            {
              props: { variant: "outlined" },
              style: { "&.Mui-disabled": { backgroundColor: p.background.subtle, borderColor: p.divider, color: p.text.disabled } },
            },
          ],
        };
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        width: climberControl.min,
        height: climberControl.min,
        borderRadius: climberRadius.md,
        color: theme.vars.palette.text.primary,
        transition: ease("background-color"),
        "&:hover": { backgroundColor: theme.vars.palette.action.hover },
      }),
    },
  },

  MuiLink: {
    defaultProps: { color: "primary", underline: "hover" },
    styleOverrides: { root: { fontWeight: 700, textUnderlineOffset: "3px" } },
  },

  // Segmented control (Classes | Events): a grey track with the chosen option on white.
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        gap: 4,
        padding: 4,
        borderRadius: climberRadius.md,
        backgroundColor: theme.vars.palette.divider,
      }),
      grouped: { border: 0, margin: 0, borderRadius: climberRadius.md - 4 },
      firstButton: { borderRadius: climberRadius.md - 4 },
      middleButton: { borderRadius: climberRadius.md - 4, borderLeft: 0, marginLeft: 0 },
      lastButton: { borderRadius: climberRadius.md - 4, borderLeft: 0, marginLeft: 0 },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          flex: 1,
          minHeight: climberControl.min,
          border: 0,
          color: p.text.secondary,
          fontSize: px(16),
          fontWeight: 700,
          textTransform: "none",
          transition: ease("background-color", "color"),
          "&:hover": { backgroundColor: p.action.hover },
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: p.background.paper, color: p.text.primary },
        };
      },
    },
  },

  MuiCheckbox: { defaultProps: { color: "primary" } },
  MuiRadio: { defaultProps: { color: "primary" } },
  MuiSwitch: { defaultProps: { color: "primary" } },

  // Tags and status: soft fill, colored text, fully round. StatusPill adds ✓, ! or ✕.
  MuiChip: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          height: 32,
          borderRadius: climberRadius.full,
          border: 0,
          fontSize: px(15),
          fontWeight: 700,
          backgroundColor: p.background.subtle,
          color: p.text.primary,
          variants: (["primary", "success", "warning", "error", "info"] as const).map((color) => ({
            props: { color },
            style: { backgroundColor: p[color].soft, color: p[color].main },
          })),
        };
      },
      label: { paddingLeft: 12, paddingRight: 12 },
      icon: { color: "inherit", marginLeft: 11, marginRight: -5, fontSize: px(13), fontWeight: 800 },
    },
  },

  // Cards: white on grey, big radius, no border and no shadow.
  MuiCard: {
    defaultProps: { variant: "elevation", elevation: 0 },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: climberRadius.lg,
        border: 0,
        backgroundColor: theme.vars.palette.background.paper,
        boxShadow: "none",
      }),
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { padding: climberSpace.cardPadding, "&:last-child": { paddingBottom: climberSpace.cardPadding } },
    },
  },
  MuiAccordion: {
    defaultProps: { elevation: 0, disableGutters: true },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: climberRadius.lg,
        backgroundColor: theme.vars.palette.background.paper,
        boxShadow: "none",
        "&::before": { display: "none" },
        "&:first-of-type, &:last-of-type": { borderRadius: climberRadius.lg },
      }),
    },
  },
  MuiAccordionSummary: { styleOverrides: { root: { minHeight: climberControl.lg, padding: `0 ${climberSpace.cardPadding}px` } } },
  MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  MuiDialog: { styleOverrides: { paper: { borderRadius: climberRadius.xl } } },
  MuiDialogTitle: { styleOverrides: { root: { ...textStyle(climberText.cardTitle), padding: "20px 20px 8px" } } },
  MuiDialogContent: { styleOverrides: { root: { padding: "8px 20px" } } },
  MuiDialogActions: { styleOverrides: { root: { padding: 20, gap: 8 } } },
  MuiDivider: { styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }) } },

  // Fields: 48px, 17px text (no zoom on iOS), rounded.
  MuiTextField: { defaultProps: { size: "medium", color: "primary" } },
  MuiInputBase: { styleOverrides: { root: { fontSize: px(17) } } },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          borderRadius: climberRadius.md,
          backgroundColor: p.background.paper,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: p.divider, transition: ease("border-color") },
          "&:hover:not(.Mui-focused):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline": { borderColor: p.text.disabled },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p.primary.main, borderWidth: 2 },
          "& .MuiOutlinedInput-input": { padding: "13px 14px" },
        };
      },
    },
  },
  MuiInputLabel: { styleOverrides: { root: { fontSize: px(17) } } },
  MuiFormHelperText: { styleOverrides: { root: { fontSize: px(14), marginLeft: 4 } } },

  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          alignItems: "flex-start",
          padding: "8px 14px",
          borderRadius: climberRadius.md,
          fontSize: px(16),
          lineHeight: 1.4,
          variants: (["success", "warning", "error", "info"] as const).map((severity) => ({
            props: { severity, variant: "standard" as const },
            style: {
              backgroundColor: p[severity].soft,
              color: p[severity].main,
              "& .MuiAlert-icon": { color: p[severity].main },
            },
          })),
        };
      },
      icon: { padding: "8px 0", marginRight: 10 },
      message: { padding: "8px 0" },
    },
  },

  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }) => ({ height: 12, borderRadius: climberRadius.full, backgroundColor: theme.vars.palette.divider }),
      bar: { borderRadius: climberRadius.full },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        padding: "8px 12px",
        borderRadius: climberRadius.sm,
        backgroundColor: theme.vars.palette.text.primary,
        color: theme.vars.palette.background.paper,
        fontSize: px(15),
        fontWeight: 500,
      }),
    },
  },
};

export const climberTheme = createTheme({
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme", cssVarPrefix: "climb" },
  colorSchemes: {
    light: { palette: palette(climberColors.light, "light") },
    dark: { palette: palette(climberColors.dark, "dark") },
  },
  spacing: 4,
  // 4px, as at the desk, so sx={{ borderRadius: 5 }} is 20px (a card). Components that need
  // a climber radius set it from climberRadius themselves.
  shape: { borderRadius: 4 },
  breakpoints: { values: breakpoints },
  typography,
  shadows,
  transitions: { duration: { shortest: 100, shorter: motion.duration, short: motion.duration } },
  // Keyboard focus: a 2px teal ring outside the element.
  focusVisible: { outlineColor: "var(--climb-palette-primary-main)" },
  components,
});
