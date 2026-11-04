# events

The gym calendar: opening hours, special days, announced events, set changes (wall resets) and classes with sign-up.

**Owner:** _TBD_

## Folder shape

```
features/events/
├── actions.ts     # writes (Server Actions): class sign-up, and the desk's calendar edits
├── queries.ts     # reads: the climber dashboard and the desk's Events page
├── time.ts        # the gym's clock: days, minutes after midnight, formatting
├── hours.ts       # the week ahead and "open now" (pure)
├── schedule.ts    # when events, set changes and classes show (pure)
├── validate.ts    # checks what staff type into the forms (pure)
├── components/    # climber cards; desk/ holds the staff editor
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.

## Where it shows

- **Climber app, Home tab (`/me`)**:
  - `EventBanner`: the soonest event starting within 30 days (or on now), as the dark announcement card, canceled ones only when nothing else is on. Renders nothing when there are none; "See all events" opens the Events list.
  - Opening hours are part of Home's busyness cards (`analytics/components/CustomerBusyness.tsx`): "Right now" (open or closed, the live count, today's typical hours) and "Hours this week", where "Show busy times" opens bars under each day's open hours, shaded by the typical week (still the sample week until #39).
  - `SetChanges`: walls closed for setting now or within 30 days, then new routes for 14 days after. Hidden when there are none.
- **Climber app, Classes tab (`/me/classes`)**: a Classes | Events | Calendar switch (`ClassesOrEvents`, `?view=events` or `?view=calendar` in the URL).
  - `Classes`: the next 14 days, with sign up and cancel. Free; capacity is the only limit. A canceled class only shows to climbers who were signed up.
  - `EventsList`: every event in the next 60 days, canceled ones marked.
  - `Calendar` / `CalendarView`: the same classes and events by day on a month grid (`calendar.ts`, Monday first), with a dot per kind and the coming week's closed days. Tapping a day lists it underneath; tapping an item opens a bottom sheet (MUI `Drawer`, `disablePortal` so it stays inside `ClimberTheme`). A class's sheet is the same `ClassList` card, so sign up and cancel work there too.
- **Desk (`/desk/events`, "Events" in the menu)**: five tabs, each its own page (`EventsTabs`, `components/desk/DeskCalendar.tsx`):
  - **Hours** (`/desk/events/hours`): the regular week (all seven days save together) and special days.
  - **Class types** (`/desk/events/class-types`): the kinds of class the gym runs (`ClassType`): add, edit, archive.
  - **Classes** (`/desk/events/classes`): schedule a session of a type (it copies the type; instructor and places can be changed for that session), cancel one, see who signed up.
  - **Set changes** (`/desk/events/set-changes`) and **Events** (`/desk/events/announcements`): plan and cancel.

## Rules

- Times are stored as real moments (`DateTime`); hours as minutes after midnight on the gym's clock. Everything is shown in `Gym.timeZone`, never the server's zone.
- Climbers act for themselves only: the climber and their gym come from the session. Staff act on their own gym only (`getStaffContext`).
- Nothing is deleted: events, set changes and classes are canceled (`canceledAt`), special days removed (`removedAt`), class places cancelled (`ClassBooking.canceledAt`).
- The seed (`prisma/seed-calendar.ts`) dates everything from today, so the demo always has something coming up.
