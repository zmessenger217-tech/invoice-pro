# Security Specification — InvoicePro Finance Manager

## 1. Data Invariants

1. **Workspace Ownership Invariant**: A `/workspaces/{userId}` document can only be created, read, updated, or deleted by the authenticated user with `request.auth.uid == userId`, `request.auth.token.email_verified == true`, and `data.ownerId == request.auth.uid`.
2. **Master Gate Relational Sync Invariant**: Every subcollection document (`/clients/{clientId}`, `/expenses/{expenseId}`, `/partners/{partnerId}`) under `/workspaces/{userId}` requires that the parent `/workspaces/{userId}` document exists and its `ownerId` matches `request.auth.uid`.
3. **Strict Schema & Anti-Shadow-Field Invariant**: Every `create` operation enforces `data.keys().hasAll(...)` and `data.keys().hasOnly(...)` with exact field types, regex patterns, and `maxLength` bounds synced verbatim from `firebase-blueprint.json`.
4. **Immutable Identity & Temporal Integrity Invariant**: `ownerId` and `createdAt` are immutable across all updates (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`). `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
5. **Query Enforcer & Cost-Optimization Invariant**: All `allow list` rules verify `userId == request.auth.uid && resource.data.ownerId == request.auth.uid` without invoking `get()` or `exists()`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Workspace Create)**: Authenticated user `user_A` attempts to create `/workspaces/user_A` with `ownerId: "user_B"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Cross-Tenant PII Read)**: Authenticated user `user_B` attempts `get` on `/workspaces/user_A`. -> `PERMISSION_DENIED`
3. **Payload 3 (Unverified Email Write)**: User `user_A` with `email_verified: false` attempts to create `/workspaces/user_A`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow / Ghost Field Injection)**: User `user_A` attempts to create `/workspaces/user_A` with an undeclared field `"isAdmin": true`. -> `PERMISSION_DENIED`
5. **Payload 5 (Orphaned Subcollection Write)**: User `user_A` attempts to create `/workspaces/user_A/clients/sch-1` before `/workspaces/user_A` exists. -> `PERMISSION_DENIED`
6. **Payload 6 (Path ID Poisoning)**: User `user_A` attempts to create `/workspaces/user_A/clients/invalid$id!@#` violating `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`
7. **Payload 7 (Denial-of-Wallet String Overflow)**: User `user_A` attempts to set `Client.name` to a 500-character string (exceeding `maxLength: 120`). -> `PERMISSION_DENIED`
8. **Payload 8 (Client-Spoofed Timestamp)**: User `user_A` attempts to create an `Expense` where `createdAt` is a past or future timestamp (`!= request.time`). -> `PERMISSION_DENIED`
9. **Payload 9 (Immortal Field Mutation on Update)**: User `user_A` attempts to update `Client` while mutating `createdAt` or `ownerId`. -> `PERMISSION_DENIED`
10. **Payload 10 (Invalid Enum Injection)**: User `user_A` attempts to create an `Expense` with `category: "Crypto Speculation"` (not in enum). -> `PERMISSION_DENIED`
11. **Payload 11 (Value Poisoning on Update)**: User `user_A` updates whitelisted key `monthlyPayment` on `Partner` with a string `"10000"` instead of a non-negative number. -> `PERMISSION_DENIED`
12. **Payload 12 (Unauthorized List Scraping)**: User `user_B` attempts a `list` query on `/workspaces/user_A/clients`. -> `PERMISSION_DENIED`
