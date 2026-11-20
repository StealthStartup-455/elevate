# fix/237-check-in-dialog-pos-button

**What:** The desk's Check in dialog now shows a red POS button on a picked climber (scan or search). It links to `/desk/pos?climber=<id>`; disabled with a reason when POS is off. Before, only "Give free day pass" appeared.

**Files:** `ManualCheckIn.tsx`, `LinkButton.tsx` (color `error`), `climbers/actions.ts` (`findClimbersToCheckIn` returns `posEnabled`), `climbers/types.ts`, `e2e/manual-check-in.spec.ts`, check-ins README.

**Decisions:** `posEnabled` is read once per search, not per climber. Red via `color="error"` (theme), as asked.

**Follow-ups:** None.

**Verification:** see PR.
