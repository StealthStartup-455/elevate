# gyms

Public discovery and self-service setup for Elevate-managed gyms.

- `queries.ts` returns only the name, URL slug and time zone of `ELEVATE` gyms, so the customer search never exposes gym-private data.
- `joinGym` creates one gym-scoped `Climber` record for the authenticated customer, selects it as active, then sends them to that gym's waiver.
- `signUpGym` creates a `Gym` and one active `OWNER` `Staff` row in one transaction. It intentionally does not create external-system connections.
