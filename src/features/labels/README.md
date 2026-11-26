# labels

Customer labels (#157): short notes staff put on a customer, like "Ask for ID" or "Must retest belay", so whoever is at the desk sees them when that person comes in.

**Owner:** _TBD_

## Folder shape

```
features/labels/
├── actions.ts     # writes (Server Actions): createLabel, setClimberLabel, labelsToPick
├── queries.ts     # reads: listGymLabels, getClimberLabels, getLabelsForClimbers
├── validate.ts    # what a label name may be (30 characters, 50 active labels a gym)
├── components/    # ClimberLabels (add and take off), LabelChips (read only)
└── *.test.ts
```

## Staff only

Labels are for staff and are **never shown on `/me`**. They are not on the shared `Climber` type or in `getClimber`, which the climber's own pages read. Desk screens load them separately (`DeskClimberPanel.labels`, `DeskRow.labels`, `ScannedClimber.labels`). Every read and action calls `requireStaff()` and is limited to the staff member's gym. Logs carry ids only, never a label's words.

## Where they show

- **Check-in climber panel**, under the check-in status: add, take off.
- **Customer page** (`/desk/customers/[climberId]`), under Membership: add, take off.
- **Today's check-ins table**, beside the name: the first 2, then "+N more".
- **Arrival toast and Arrivals list**, under the name: the first 3, then "+N more".

Lists load every climber's labels in one query (`getLabelsForClimbers`), never one per row: the arrivals poll runs every few seconds on every desk.

## The tables

- `GymLabel`: the gym's labels, one per wording. `key` is the name in lower case and unique in a gym, so "ask for id" is the same label as "Ask for ID". `active` switches one off instead of deleting it.
- `ClimberLabel`: one row per customer and label. Taking a label off sets `removedAt` and `removedById`; putting it back clears them on the same row. Nothing is deleted.

Any staff role can create a label, put it on and take it off. The shared demo desk login has no staff id, so "who" is empty for it. Belay status is separate (#195), not a label.
