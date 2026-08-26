# Update loop diagnosis

The published `version.json` advertised build 2026082602 while `update_v10_10_9.js` still declared CURRENT_BUILD=2026082601. This makes every reload rediscover the same newer build and apply it again indefinitely. The immediate safe hotfix is to align the published build with the updater's embedded build while preserving the already-merged registration code.