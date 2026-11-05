"use client";

import Card from "@mui/material/Card";
import Collapse from "@mui/material/Collapse";
import Drawer from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getDeskClimberPanel } from "../actions";
import ClimberProfile, { type ProfileState } from "./ClimberProfile";

// The climber panel on the Check-in page (#169). ?climber=<id> holds it, so a
// link opens it and Back closes it. The URL changes with history.pushState,
// which Next.js keeps in sync with useSearchParams without asking the server
// for the page again: the table, its filter and the scroll position stay as
// they are. The panel's data comes from getDeskClimberPanel.
//
// On a wide screen the panel sits beside the table (ClimberPanelArea) and the
// table makes room for it. Narrower than that there's no room for both, so it
// slides in over the page instead, full width on a phone.

const PARAM = "climber";

type Panel = {
  openId: string | null;
  openClimber: (id: string) => void;
  close: () => void;
  reload: () => Promise<void>;
  /** Who the panel shows, kept while it closes so it doesn't empty mid-slide. */
  showingId: string | null;
  state: ProfileState;
  /** Wide enough to sit beside the table; null until the browser says. */
  wide: boolean | null;
};

const PanelContext = createContext<Panel | null>(null);

/** The panel on this page, or null on a page without one. */
export function useClimberPanel(): Panel | null {
  return useContext(PanelContext);
}

// This page's URL with ?climber set to `id`, or without it; date and page stay.
function urlWith(id: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(PARAM, id);
  else params.delete(PARAM);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

// Whether the screen is at least the theme's lg breakpoint. Unknown (null) on
// the server and while hydrating, so the first render never guesses wrong.
function useWide(): boolean | null {
  const query = useTheme().breakpoints.up("lg").replace(/^@media\s*/, "");
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

type Loaded = { id: string; state: ProfileState };

export default function ClimberPanelProvider({ children }: { children: ReactNode }) {
  const openId = useSearchParams().get(PARAM);
  const wide = useWide();
  // True when this page added the history entry for the open panel, so
  // closing goes back to the entry before it instead of adding another one.
  const pushed = useRef(false);
  // The climber whose data is wanted now, so a slow answer for someone
  // else (or after closing) is dropped.
  const wanted = useRef<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const load = useCallback(async (id: string) => {
    let state: ProfileState;
    try {
      const panel = await getDeskClimberPanel(id);
      state = panel ? { kind: "ready", panel } : { kind: "missing" };
    } catch {
      state = { kind: "failed" };
    }
    if (wanted.current === id) setLoaded({ id, state });
  }, []);

  useEffect(() => {
    wanted.current = openId;
    if (!openId) {
      // Closed some other way (Back): the next open adds its own entry.
      pushed.current = false;
      return;
    }
    void load(openId);
  }, [openId, load]);

  const openClimber = useCallback(
    (id: string) => {
      if (openId) {
        // Already open: show the other climber in place.
        window.history.replaceState(null, "", urlWith(id));
      } else {
        window.history.pushState(null, "", urlWith(id));
        pushed.current = true;
      }
    },
    [openId],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      // Opened from a link: drop ?climber and stay on this entry.
      window.history.replaceState(null, "", urlWith(null));
    }
  }, []);

  const reload = useCallback(async () => {
    if (openId) await load(openId);
  }, [openId, load]);

  const showingId = openId ?? loaded?.id ?? null;
  const state: ProfileState =
    loaded && loaded.id === showingId ? loaded.state : { kind: "loading" };

  const panel: Panel = { openId, openClimber, close, reload, showingId, state, wide };

  return (
    <PanelContext.Provider value={panel}>
      {children}
      {wide === false ? (
        <Drawer
          anchor="right"
          open={!!openId}
          onClose={close}
          slotProps={{
            paper: {
              className: "w-full sm:w-105",
              role: "dialog",
              "aria-modal": true,
              "aria-labelledby": "climber-panel-title",
            },
          }}
        >
          <Profile panel={panel} />
        </Drawer>
      ) : null}
    </PanelContext.Provider>
  );
}

function Profile({ panel }: { panel: Panel }) {
  if (!panel.showingId) return null;
  return (
    <ClimberProfile
      key={panel.showingId}
      climberId={panel.showingId}
      state={panel.state}
      onClose={panel.close}
      onChanged={panel.reload}
    />
  );
}

/**
 * The table and, on a wide screen, the panel beside it. The table gives up
 * the panel's width while it's open, and takes it back when it closes.
 */
export function ClimberPanelArea({ children }: { children: ReactNode }) {
  const panel = useClimberPanel();
  const open = !!panel?.openId && panel.wide === true;
  const aside = useRef<HTMLElement>(null);
  // What had focus when the panel opened (usually the name clicked), to go
  // back to when it closes.
  const returnTo = useRef<HTMLElement | null>(null);
  const openId = panel?.openId ?? null;
  const close = panel?.close;

  // Opening: focus moves into the panel. Closing (✕, Esc or Back): back to
  // where it was, if focus was still in the panel.
  useEffect(() => {
    if (!open) return;
    if (!aside.current?.contains(document.activeElement)) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    aside.current?.focus({ preventScroll: true });
    const node = aside.current;
    return () => {
      const inPanel = !document.activeElement || document.activeElement === document.body || node?.contains(document.activeElement);
      if (inPanel) returnTo.current?.focus({ preventScroll: true });
    };
  }, [open, openId]);

  // Esc closes it, unless something on top (a menu, a dialog, a search
  // list) used the key first.
  useEffect(() => {
    if (!open || !close) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div className="flex items-start">
      <div className="min-w-0 flex-1">{children}</div>
      {panel && panel.wide ? (
        // Sticks to the top of the screen, so it stays in view next to a row
        // far down the table.
        <Collapse in={open} orientation="horizontal" unmountOnExit className="sticky top-0 shrink-0">
          <div className="pl-3">
            <Card
              component="aside"
              ref={aside}
              tabIndex={-1}
              aria-labelledby="climber-panel-title"
              className="flex max-h-screen w-105 flex-col outline-none"
            >
              <Profile panel={panel} />
            </Card>
          </div>
        </Collapse>
      ) : null}
    </div>
  );
}
