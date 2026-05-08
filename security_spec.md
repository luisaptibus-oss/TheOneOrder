# Security Specification - HACCP-CORE

## Data Invariants
1. Assets can only be read/written by their owner.
2. Sub-resources (Receipts, Sensors) must inherit access from the parent Asset.
3. User must be verified to write any data.
4. Timestamps must be server-generated.
5. IDs must be sanitized (isValidId).

## The Dirty Dozen Payloads (Targeting Rejection)

1. **Identity Spoofing**: Create Asset with `ownerId` of another user.
2. **Orphaned Write**: Create a Receipt for an Asset that doesn't exist.
3. **Privilege Escalation**: Update a sensor's `mac` address (immutable field).
4. **Value Poisoning**: Inject a 1MB string into `produto_nome`.
5. **State Shortcut**: Inject a `metadata` field into a Receipt (not in schema).
6. **Identity Poisoning**: Use `../../trash` as an Asset ID.
7. **Time Spoofing**: Send a future timestamp in `timestamp` field.
8. **Shadow Field**: Add `isVerified: true` to a Receipt.
9. **Bulk Scrape**: Try to list all Assets without an owner filter.
10. **Type Injection**: Send a boolean as `lastValue` (expected number).
11. **Relational Leak**: Read a Receipt from an Asset you don't own.
12. **Denial of Wallet**: Trigger 1000 list queries on a large collection without constraints.

## Logic Guards to Implement
- `isValidAsset(data)`
- `isValidReceipt(data)`
- `isValidSensor(data)`
- `isValidTelemetry(data)`
- `isOwner(assetId)`
- `isValidId(id)`
