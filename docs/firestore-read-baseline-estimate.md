# Read amplification estimate

For a trainer with `S` linked student documents and `I` invite documents (capped at 300), the removed automatic paths could add approximately:

- dashboard invite audit: `I` document reads per `renderTrainer()`;
- legacy reconciliation once per page session: `S + I` document reads, plus a trainer-profile authorization read in the previous implementation;
- any extra dashboard render could repeat the dashboard list and invite audit.

Example only: with 20 linked students and 40 invite records, the redundant maintenance layer alone could account for roughly 101 extra document reads on a clean page session (`40 + 20 + 40 + 1`), before considering a duplicate dashboard render. Actual Firestore billing depends on the documents returned and query behavior.

The new normal path removes those maintenance reads. The linked student list itself still costs the reads required to return the trainer's students, because that data is needed to render the dashboard.
