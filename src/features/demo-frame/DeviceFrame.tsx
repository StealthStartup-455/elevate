import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DEVICES, type DeviceKind } from "./devices";

// The app inside a device, for demos: /demo-phone/<app path> and /demo/<app
// path>. The app runs in an iframe, so its media queries see the device's
// screen, not the browser window.
// - Phone: a fixed size (100%) that stays centered when the window is resized (a
//   window that is too small scrolls).
// - Desktop: fills the whole window inside a thin tablet-style bezel, so the app
//   sees the window's size and follows it as it is resized.
export default function DeviceFrame({ kind, src }: { kind: DeviceKind; src: string }) {
  if (kind === "desktop") return <Desktop src={src} />;
  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        flexGrow: 1,
        width: "100%",
        minHeight: "100dvh",
        boxSizing: "border-box",
        p: 4,
        overflow: "auto",
        bgcolor: "background.default",
      }}
    >
      {/* margin: auto centers the phone both ways and, unlike align-items, never
          pushes the top or left edge out of reach when the window is small. */}
      <Box sx={{ m: "auto", flexShrink: 0 }}>
        <Phone src={src} />
      </Box>
    </Box>
  );
}

const frameSx = { border: 0, display: "block", bgcolor: "background.paper" } as const;

function Phone({ src }: { src: string }) {
  const d = DEVICES.phone;
  const appHeight = d.screenHeight - d.statusBar - d.homeBar;
  return (
    <Box
      sx={{
        p: `${d.bezel}px`,
        bgcolor: "common.black",
        borderRadius: `${d.screenRadius + d.bezel}px`,
        outline: "2px solid",
        outlineColor: "grey.700",
        boxSizing: "content-box",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: d.screenWidth,
          height: d.screenHeight,
          borderRadius: `${d.screenRadius}px`,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: d.statusBar,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 8,
            pt: 2,
            boxSizing: "border-box",
          }}
        >
          <Typography variant="label" aria-hidden>
            9:41
          </Typography>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 11,
              left: "50%",
              width: 126,
              height: 37,
              transform: "translateX(-50%)",
              borderRadius: 999,
              bgcolor: "common.black",
            }}
          />
          <Battery />
        </Box>
        <Box
          component="iframe"
          src={src}
          title="Elevate app on iPhone"
          sx={{ ...frameSx, width: d.screenWidth, height: appHeight }}
        />
        <Box
          aria-hidden
          sx={{
            height: d.homeBar,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ width: 134, height: 5, borderRadius: 999, bgcolor: "text.primary" }} />
        </Box>
      </Box>
    </Box>
  );
}

function Battery() {
  return (
    <Box aria-hidden sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          width: 25,
          height: 12,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "text.secondary",
          p: "1px",
          boxSizing: "border-box",
        }}
      >
        <Box sx={{ width: "100%", height: "100%", borderRadius: "2px", bgcolor: "text.primary" }} />
      </Box>
    </Box>
  );
}

// A thin black bezel with rounded corners, like an iPad, filling the window.
function Desktop({ src }: { src: string }) {
  const d = DEVICES.desktop;
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        width: "100%",
        height: "100dvh",
        boxSizing: "border-box",
        p: `${d.gap}px`,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          p: `${d.bezel}px`,
          bgcolor: "common.black",
          borderRadius: `${d.deviceRadius}px`,
        }}
      >
        <Box
          component="iframe"
          src={src}
          title="Elevate app on a tablet-style screen"
          sx={{
            ...frameSx,
            width: "100%",
            height: "100%",
            borderRadius: `${d.screenRadius}px`,
          }}
        />
      </Box>
    </Box>
  );
}
