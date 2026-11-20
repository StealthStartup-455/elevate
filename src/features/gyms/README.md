# gyms

Public discovery and self-service setup for Elevate-managed gyms.

- `queries.ts` returns only the name, URL slug and time zone of `ELEVATE` gyms, so the customer search never exposes gym-private data.
- `joinGym` locks the target gym during its transaction, reuses an existing customer record, and otherwise copies the account profile into that gym. This serializes concurrent joins without forbidding a parent login from managing multiple children. Older accounts fall back to their existing climber profile; incomplete accounts go to `/me/profile`.
- Demo customers share a stable demo account ID across their gym records, so joining from another gym or tab reuses the same record.
- Real `signUpGym` saves pending gym details in Supabase metadata. Only an email-confirmed owner provisions a `Gym` and `OWNER` `Staff` in a transaction; login retries interrupted provisioning. A taken name can be changed on `/gym/signup` while logged in. No gym name is reserved before email confirmation.
- Demo owners authenticate with their salted password hash. Their desk cookie is signed using that server-only credential and checked against the active staff row on every request. The public `desk` demo login still opens only the seeded demo gym. Existing gyms cannot be reclaimed by name.
