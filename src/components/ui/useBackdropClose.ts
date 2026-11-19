"use client";

import { useCallback, useEffect, useRef } from "react";

// How long after a dialog opens that a click outside it is ignored.
const SETTLE_MS = 500;

/**
 * The onClose for a MUI Dialog so a click outside closes it (#218), except
 * right after it opens. The second click of a double-click on the button that
 * opened it lands on the backdrop and would close the dialog at once (#134), so
 * the first half second ignores clicks outside. Escape and the buttons always
 * close it straight away.
 */
export function useBackdropClose(open: boolean, close: () => void) {
  const openedAt = useRef(0);
  useEffect(() => {
    if (open) openedAt.current = Date.now();
  }, [open]);
  return useCallback(
    (_event: unknown, reason?: "backdropClick" | "escapeKeyDown") => {
      if (reason === "backdropClick" && Date.now() - openedAt.current < SETTLE_MS) return;
      close();
    },
    [close],
  );
}
