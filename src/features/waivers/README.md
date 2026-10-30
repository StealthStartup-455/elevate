# waivers

Elevate's own waiver tool (#35). Climbers sign the gym's waiver on `/me/waiver`; later, existing waivers are imported, matched to climbers and checked for duplicates. Wrong matches are a legal risk, so test this well.

**Owner:** @Khanh150104

## What's here

- `queries.ts`: what other features call. `getCurrentWaiverTemplate()`, `getWaiverStatus(climberId)`, `getSignedWaiver(id)`.
- `actions.ts`: `submitWaiver`, the signing form's server action.
- `validate.ts`, `hash.ts`, `access.ts`: the form rules, the wording's fingerprint, and who may act for a climber.
- `components/WaiverForm.tsx`: the signing form.
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
