import { useEffect, useSyncExternalStore } from "react";

// One dialog at a time on the front desk (#92). Other desk dialogs (manual
// check in) report while they're open; the scan popup waits until they close.
// A waiting scan stays in the database untaken, so nothing is lost: it pops
// up as soon as the other dialog closes.

let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Call in a desk dialog with its open state.
export function useDeskDialogOpen(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    emit();
    return () => {
      openCount -= 1;
      emit();
    };
  }, [open]);
}

// True while another desk dialog is open.
export function useOtherDeskDialogOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => openCount > 0,
    () => false,
  );
}
