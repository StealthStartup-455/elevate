# demo-frame

The app inside a device, for demos and screen recordings.

- `/demo-phone/<app path>`: the app in an iPhone 17 Pro (402 x 874). `/demo-phone/me/classes` shows `/me/classes`.
- `/demo/<app path>`: the app filling the whole window inside a thin, iPad-style bezel. `/demo/desk/customers` shows `/desk/customers`.
- With no path, both show `/`. A query string is passed on (`/demo-phone/me/classes?view=events`).

**Owner:** _TBD_

## How it works

- The app runs in an iframe, so its responsive layout sees the device's screen, not the browser window. The app inside the phone is 402 x 796: the status bar (54) and home bar (24) are drawn outside it so they never cover the app's header or tabs.
- **Phone:** keeps its size when the window is resized and stays centered. It is always 100%, with no zoom: a window smaller than the phone scrolls.
- **Desktop (`/demo`):** fills the window, so the app sees the window size minus the bezel and follows it as the window is resized. Resize the window to change its size.
- Login works as usual: the iframe is the same site, so the demo cookies apply. Log in inside the frame.
- `path.ts` only ever builds a path on this site (segments are checked and re-encoded), and refuses `/demo...` inside a frame.
- To change a device, edit `devices.ts` (sizes) or `DeviceFrame.tsx` (the drawing).
