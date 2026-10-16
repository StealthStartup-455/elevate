// The MUI theme, built only from tokens.ts. Component overrides here are where hover, focus and
// density rules live, so screens can't drift. See STYLE_GUIDE.md before changing anything.
import { createTheme, type Shadows, type ThemeOptions } from "@mui/material/styles";
import {
  colors,
  controlHeight,
  fonts,
  motion,
  px,
  radius,
  space,
  spacingUnit,
  textStyles,
  type RoleColor,
  type SchemeColors,
  type StatusColor,
  type TextStyle,
} from "./tokens";

// Matches Tailwind's default breakpoints, so sx={{ p: { sm: 3 } }} and sm:p-3 switch together.
export const breakpoints = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

const touch = "@media (pointer: coarse)";
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

function palette(c: SchemeColors) {
  return {
    primary: role(c.action), // actions: check in, save, buy, send
    secondary: role(c.nav), // navigation and settings: links, filters, tabs, toggles
    info: role(c.nav),
    success: status(c.ok),
    warning: status(c.warn),
    error: status(c.bad),
    text: { primary: c.text, secondary: c.muted, disabled: c.disabled },
    background: { default: c.page, paper: c.surface, subtle: c.subtle },
    divider: c.line,
    action: {
      hover: c.hover,
      selected: c.selected,
      focus: c.selected,
      disabled: c.disabled,
      disabledBackground: c.subtle,
    },
    sidebar: c.sidebar,
    chart: c.chart,
    floatShadow: c.floatShadow,
  };
}

function textStyle(t: TextStyle, withColor = true) {
  return {
    fontFamily: fonts.sans,
    fontSize: px(t.size),
    lineHeight: t.lineHeight,
    fontWeight: t.weight,
    letterSpacing: t.uppercase ? "0.06em" : 0,
    ...("head" in t && t.head ? { fontStretch: fonts.headStretch } : {}),
    ...("uppercase" in t && t.uppercase ? { textTransform: "uppercase" as const } : {}),
    ...(withColor && "muted" in t && t.muted ? { color: "var(--mui-palette-text-secondary)" } : {}),
  };
}

const typography: ThemeOptions["typography"] = {
  fontFamily: fonts.sans,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  // The six text styles. Use these in new code.
  pageTitle: textStyle(textStyles.pageTitle),
  cardTitle: textStyle(textStyles.cardTitle),
  kpi: textStyle(textStyles.kpi),
  body: textStyle(textStyles.body),
  secondary: textStyle(textStyles.secondary),
  label: textStyle(textStyles.label),

  // MUI's built-in variants, restyled to match the six styles. MUI's own components use them,
  // and so do screens written before the style guide. They carry no color, so they can't
  // repaint MUI components.
  h1: textStyle(textStyles.pageTitle),
  h2: textStyle(textStyles.pageTitle),
  h3: textStyle(textStyles.pageTitle),
  h4: textStyle(textStyles.pageTitle),
  h5: textStyle(textStyles.pageTitle),
  h6: textStyle(textStyles.cardTitle),
  subtitle1: { ...textStyle(textStyles.body), fontWeight: 600 },
  subtitle2: { ...textStyle(textStyles.body), fontWeight: 600 },
  body1: textStyle(textStyles.body),
  body2: textStyle(textStyles.secondary, false),
  caption: textStyle(textStyles.secondary, false),
  overline: textStyle(textStyles.label, false),
  button: { fontFamily: fonts.sans, fontSize: px(13), fontWeight: 600, lineHeight: 1, textTransform: "none" },
};

// Only things that float get a shadow. MUI uses elevation 6+ for snackbars, 8 for menus and
// popovers and 24 for dialogs; everything below 6 is flat.
const shadows = Array.from({ length: 25 }, (_, i) =>
  i < 6 ? "none" : "var(--mui-palette-floatShadow)",
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
        h1: "h1",
        h2: "h2",
        h3: "h3",
        h4: "h4",
        h5: "h5",
        h6: "h6",
        subtitle1: "h6",
        subtitle2: "h6",
        body1: "p",
        body2: "p",
        inherit: "p",
      },
    },
  },

  // Buttons are actions. contained = the one main action in an area, outlined = every other
  // action (rendered as a tinted button), text = low-emphasis.
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          height: controlHeight.md,
          minWidth: 0,
          padding: `0 ${space.controlX}px`,
          borderRadius: radius.md,
          fontSize: px(13),
          fontWeight: 600,
          lineHeight: 1,
          textTransform: "none",
          whiteSpace: "nowrap",
          boxShadow: "none",
          transition: ease("background-color", "border-color", "color"),
          "&:hover, &:active": { boxShadow: "none" },
          [touch]: { height: controlHeight.lg },
          variants: [
            { props: { size: "small" }, style: { height: controlHeight.sm, padding: "0 8px", fontSize: px(12) } },
            { props: { size: "large" }, style: { height: controlHeight.lg, padding: "0 16px", fontSize: px(14) } },
            ...(["primary", "secondary"] as const).flatMap((color) => [
              {
                props: { variant: "contained" as const, color },
                style: {
                  "&:hover": { backgroundColor: p[color].dark },
                  "&:active": { backgroundColor: p[color].pressed },
                },
              },
              {
                props: { variant: "outlined" as const, color },
                style: {
                  backgroundColor: p[color].soft,
                  borderColor: p[color].border,
                  color: p[color].main,
                  "&:hover": { backgroundColor: p[color].softHover, borderColor: p[color].main },
                  "&:active": { borderColor: p[color].main },
                },
              },
              {
                props: { variant: "text" as const, color },
                style: { color: p[color].main, "&:hover": { backgroundColor: p[color].soft } },
              },
            ]),
            {
              props: { variant: "contained" },
              style: { "&.Mui-disabled": { backgroundColor: p.background.subtle, color: p.text.disabled } },
            },
            {
              props: { variant: "outlined" },
              style: {
                "&.Mui-disabled": {
                  backgroundColor: p.background.subtle,
                  borderColor: p.divider,
                  color: p.text.disabled,
                },
              },
            },
          ],
        };
      },
    },
  },

  MuiIconButton: {
    defaultProps: { size: "small" },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: radius.md,
        padding: 4,
        color: theme.vars.palette.text.secondary,
        transition: ease("background-color", "color"),
        "&:hover": { backgroundColor: theme.vars.palette.action.hover, color: theme.vars.palette.text.primary },
        [touch]: { padding: 10 },
      }),
    },
  },

  // Links move you around: slate blue, semibold, underline on hover.
  MuiLink: {
    defaultProps: { color: "secondary", underline: "hover" },
    styleOverrides: { root: { fontWeight: 600, textUnderlineOffset: "3px" } },
  },

  // Segmented control for settings that change the view (timeframes, filters).
  MuiToggleButtonGroup: {
    defaultProps: { color: "secondary", size: "small" },
    styleOverrides: {
      root: ({ theme }) => ({
        gap: 2,
        padding: 2,
        borderRadius: radius.md,
        backgroundColor: theme.vars.palette.secondary.soft,
      }),
      grouped: { border: 0, margin: 0, borderRadius: radius.md - 2 },
      firstButton: { borderRadius: radius.md - 2 },
      middleButton: { borderRadius: radius.md - 2, borderLeft: 0, marginLeft: 0 },
      lastButton: { borderRadius: radius.md - 2, borderLeft: 0, marginLeft: 0 },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => {
        const nav = theme.vars.palette.secondary;
        return {
          height: controlHeight.sm - 4,
          padding: "0 8px",
          border: 0,
          borderRadius: radius.md - 2,
          color: nav.main,
          fontSize: px(12),
          fontWeight: 600,
          lineHeight: 1,
          textTransform: "none",
          whiteSpace: "nowrap",
          transition: ease("background-color", "color"),
          "&:hover": { backgroundColor: nav.softHover },
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: nav.main, color: nav.contrastText },
          [touch]: { height: controlHeight.lg - 4, padding: "0 12px" },
          variants: [
            { props: { size: "medium" }, style: { height: controlHeight.md - 4, padding: "0 10px", fontSize: px(13) } },
          ],
        };
      },
    },
  },

  MuiTabs: {
    defaultProps: { textColor: "secondary", indicatorColor: "secondary" },
    styleOverrides: { root: { minHeight: 32 } },
  },
  MuiTab: {
    styleOverrides: {
      root: { minHeight: 32, padding: "0 12px", fontSize: px(13), fontWeight: 600, textTransform: "none" },
    },
  },

  MuiCheckbox: { defaultProps: { color: "secondary", size: "small" } },
  MuiRadio: { defaultProps: { color: "secondary", size: "small" } },
  MuiSwitch: { defaultProps: { color: "secondary", size: "small" } },

  // Status pills: soft fill, colored text, fully round. Use StatusPill so the icon is never missing.
  MuiChip: {
    defaultProps: { size: "small" },
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          height: 22,
          borderRadius: radius.full,
          border: 0,
          fontSize: px(12),
          fontWeight: 600,
          backgroundColor: p.background.subtle,
          color: p.text.primary,
          variants: [
            { props: { size: "small" }, style: { height: 20 } },
            ...(["primary", "secondary", "info", "success", "warning", "error"] as const).map((color) => ({
              props: { color },
              style: {
                backgroundColor: p[color].soft,
                color: p[color].main,
                border: 0,
                "&.MuiChip-clickable:hover": { backgroundColor: p[color].softHover },
              },
            })),
          ],
        };
      },
      label: { paddingLeft: 8, paddingRight: 8 },
      icon: { color: "inherit", marginLeft: 7, marginRight: -3, fontSize: px(11), fontWeight: 800 },
    },
  },

  // Cards are flat: 1px border, no shadow.
  MuiCard: {
    defaultProps: { variant: "outlined" },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: radius.lg,
        borderColor: theme.vars.palette.divider,
        backgroundColor: theme.vars.palette.background.paper,
        boxShadow: "none",
      }),
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: { padding: space.cardPadding, "&:last-child": { paddingBottom: space.cardPadding } },
    },
  },
  MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  MuiPopover: {
    styleOverrides: {
      paper: ({ theme }) => ({ borderRadius: radius.md, border: `1px solid ${theme.vars.palette.divider}` }),
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: { minHeight: controlHeight.md, fontSize: px(13), [touch]: { minHeight: controlHeight.lg } },
    },
  },
  MuiDialog: { styleOverrides: { paper: { borderRadius: radius.lg } } },
  MuiDivider: { styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }) } },

  MuiTooltip: {
    defaultProps: { enterDelay: motion.tooltipDelay, enterNextDelay: motion.tooltipDelay },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        maxWidth: 230,
        padding: "6px 9px",
        borderRadius: radius.sm,
        backgroundColor: theme.vars.palette.text.primary,
        color: theme.vars.palette.background.paper,
        boxShadow: theme.vars.palette.floatShadow,
        fontSize: px(12),
        fontWeight: 500,
        lineHeight: 1.35,
      }),
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: `${space.rowY}px 8px`,
        borderColor: theme.vars.palette.divider,
        fontSize: px(13),
        lineHeight: 1.5,
      }),
      head: { ...textStyle(textStyles.label), whiteSpace: "nowrap" },
      sizeSmall: { padding: `${space.rowY}px 8px` },
    },
  },
  // `hover` is for rows that open something. Make the row's main cell a link.
  MuiTableRow: {
    styleOverrides: {
      root: ({ theme }) => ({
        "& td": { transition: ease("background-color") },
        "&.MuiTableRow-hover:hover": { backgroundColor: theme.vars.palette.background.subtle },
      }),
    },
  },

  // Fields: 28px tall by default (size="small"), 40px with size="medium" and on touch screens.
  // Inputs use 16px text on touch screens so iOS doesn't zoom in on focus.
  MuiTextField: { defaultProps: { size: "small", color: "secondary" } },
  MuiFormControl: { defaultProps: { size: "small", color: "secondary" } },
  MuiInputBase: {
    styleOverrides: {
      root: { fontSize: px(13), [touch]: { fontSize: px(16) } },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          borderRadius: radius.md,
          backgroundColor: p.background.paper,
          transition: ease("border-color"),
          "& .MuiOutlinedInput-notchedOutline": { borderColor: p.divider, transition: ease("border-color") },
          "&:hover:not(.Mui-focused):not(.Mui-disabled) .MuiOutlinedInput-notchedOutline": {
            borderColor: p.text.disabled,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: p.secondary.main },
          "& .MuiOutlinedInput-input": { padding: "10px 12px" },
          "& .MuiOutlinedInput-input:not(textarea)": { height: 20 },
          "&.MuiInputBase-sizeSmall .MuiOutlinedInput-input": { padding: `4px ${space.controlX}px` },
          "&.MuiInputBase-multiline": { padding: 0 },
          "&.MuiInputBase-adornedStart": { paddingLeft: space.controlX },
          "&.MuiInputBase-adornedEnd": { paddingRight: space.controlX },
          "& .MuiInputBase-inputAdornedStart.MuiOutlinedInput-input": { paddingLeft: 0 },
          "& .MuiInputBase-inputAdornedEnd.MuiOutlinedInput-input": { paddingRight: 0 },
          [touch]: { "&.MuiInputBase-sizeSmall .MuiOutlinedInput-input": { padding: "10px 12px" } },
        };
      },
      notchedOutline: { "& legend": { fontSize: "0.85em" } },
    },
  },
  // Floating labels, re-centred for the 28px and 40px field heights.
  MuiInputLabel: {
    styleOverrides: {
      root: {
        fontSize: px(13),
        "&.MuiInputLabel-outlined": { transform: "translate(12px, 11px) scale(1)" },
        "&.MuiInputLabel-outlined.MuiInputLabel-sizeSmall": { transform: "translate(10px, 5px) scale(1)" },
        "&.MuiInputLabel-outlined.MuiInputLabel-shrink": {
          transform: "translate(12px, -8px) scale(0.85)",
          maxWidth: "calc(117% - 24px)",
        },
        "&.MuiInputLabel-outlined.MuiInputLabel-sizeSmall.MuiInputLabel-shrink": {
          transform: "translate(10px, -8px) scale(0.85)",
        },
        [touch]: {
          fontSize: px(16),
          "&.MuiInputLabel-outlined, &.MuiInputLabel-outlined.MuiInputLabel-sizeSmall": {
            transform: "translate(12px, 9px) scale(1)",
          },
          "&.MuiInputLabel-outlined.MuiInputLabel-shrink, &.MuiInputLabel-outlined.MuiInputLabel-sizeSmall.MuiInputLabel-shrink":
            { transform: "translate(12px, -10px) scale(0.85)" },
        },
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: { root: { margin: `4px ${space.controlX}px 0`, fontSize: px(12), lineHeight: 1.4 } },
  },

  // Alerts use the soft status colors. info = navigation blue.
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => {
        const p = theme.vars.palette;
        return {
          alignItems: "center",
          padding: `2px ${space.controlX}px`,
          borderRadius: radius.md,
          fontSize: px(13),
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
      icon: { padding: "6px 0", marginRight: 8, fontSize: px(18) },
      message: { padding: "6px 0" },
    },
  },

  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }) => ({ height: 6, borderRadius: radius.full, backgroundColor: theme.vars.palette.background.subtle }),
      bar: { borderRadius: radius.full },
    },
  },
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
  colorSchemes: {
    light: { palette: palette(colors.light) },
    dark: { palette: palette(colors.dark) },
  },
  spacing: spacingUnit,
  shape: { borderRadius: radius.md },
  breakpoints: { values: breakpoints },
  typography,
  shadows,
  transitions: { duration: { shortest: 100, shorter: motion.duration, short: motion.duration } },
  // Keyboard focus: 2px slate-blue ring, 2px outside the element, on every MUI control.
  focusVisible: { outlineColor: "var(--mui-palette-secondary-main)" },
  components,
});
