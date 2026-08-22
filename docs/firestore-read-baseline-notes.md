# Remaining legitimate Firestore reads

This change intentionally does not remove reads that correspond to user actions or required screen data. These remain expected:

- loading the trainer's linked student list;
- opening a specific student and loading that student's workouts/sessions;
- opening reports/questionnaires;
- loading progress photo records when a report/photo is opened;
- weekly/protocol schedule data when those screens or workflows require it;
- initial shared catalogs cached for trainer use.

The purpose of the patch is to remove maintenance reads that occurred with no user request and no pending migration.
