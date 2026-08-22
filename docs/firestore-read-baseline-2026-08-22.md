# Firestore read baseline audit — 2026-08-22

## Residual amplification found after the quota spike fix

The runaway reconciliation loop was already fixed, but two automatic paths still kept the trainer's normal read baseline above older days:

1. `security-hardening` rendered the linked students list and then queried up to 300 `studentInvites` documents on every `renderTrainer()` only to audit old links.
2. `legacy-student-link-repair` automatically ran once per trainer page session even when no migration was active. A clean run could read the linked student set, up to 300 invite records, and the trainer profile again.

These were not infinite loops, but they created a repeatable floor of extra reads every time the trainer opened or refreshed the dashboard.

## New behavior

- Normal trainer dashboard: only the scoped `users(role=student, trainerId=currentTrainer)` query is required for the list.
- No automatic `studentInvites` audit during normal renders.
- Legacy reconciliation remains available through `VERIFICAR VÍNCULOS` and only runs after an explicit click.
- Automatic legacy migration runs only when the already-loaded trainer profile has `legacyMigrationEnabled === true`.
- The migration code no longer re-reads the trainer profile solely to rediscover that flag.
- Firestore/Storage rules are unchanged.
- No listeners or polling were added.

## Expected effect

The baseline should return much closer to the pre-migration behavior. Opening/reloading the trainer dashboard no longer causes duplicate invite/reconciliation reads when nothing needs repair. Reads caused by actual usage still remain: opening a student, reports, photos, sessions, schedules, catalogs, etc.
