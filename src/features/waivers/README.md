# waivers

Elevate's own waiver tool (#35). Climbers sign the gym's waiver on `/me/waiver`; later, existing waivers are imported, matched to climbers and checked for duplicates. Wrong matches are a legal risk, so test this well.

**Owner:** @Khanh150104

## What's here

- `queries.ts`: what other features call. `getCurrentWaiverTemplate()`, `getWaiverStatus(climberId)`, `getSignedWaiver(id)`. For the desk (#147), which only sees its own gym: `getStaffWaiverPanel(climberId)` (status, signed date, wording version, waiver id) and `getSignedWaiverForStaff(id)`.
- `actions.ts`: `submitWaiver`, the signing form's server action, and `publishWaiver`, the desk editor's (#110): it adds the next version (`v2`) and points `Gym.waiverVersion` at it, so every climber signs again.
- `wording.ts`: the editor's rules (`parseWaiverWording`, `nextVersion`). `access.ts` `canEditWaiver()`: managers and owners, plus the demo desk login.
- The desk's `/desk/waivers` lists every version and its signatures (`getStaffWaiverWording`); `/desk/waivers/edit` is the editor (`components/WaiverEditor.tsx`).
- `validate.ts`, `hash.ts`, `access.ts`: the form rules, the wording's fingerprint, and who may act for a climber.
- `components/WaiverForm.tsx`: the signing form. `components/SignedWaiverDetails.tsx`: the signed waiver as read, shared by the climber's page (`/me/waiver/[id]`) and the desk's (`/desk/waivers/[id]`).
- `pdf.ts`: a signed waiver as a PDF (#111), built on download from the saved record, so no file is stored. Downloaded from `/me/waiver/[id]/pdf` (the climber) and `/desk/waivers/[id]/pdf` (staff, own gym only).
- `sample-waiver.ts`: placeholder wording for the seed. Not a legal document.

## Rules

- A gym's wording (`WaiverTemplate`) is never edited once published. New wording is a new version, and `Gym.waiverVersion` points at it.
- A signed `Waiver` is never edited or deleted. It saves the template, its hash, the signer, the signature, the login, IP and user agent.
- Under 19 (`ADULT_AGE`), a parent or guardian signs.

## Folder shape

```
features/waivers/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.
