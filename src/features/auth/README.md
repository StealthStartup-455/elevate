# auth

Logins, staff roles (desk, manager, owner) and permission checks.

**Owner:** _TBD_

## Folder shape

```
features/auth/
├── actions.ts     # writes (Server Actions)
├── queries.ts     # reads
├── components/    # UI used only by this feature
└── *.test.ts
```

Pages in `src/app/` import from here. Nothing outside this folder talks to its tables directly.
