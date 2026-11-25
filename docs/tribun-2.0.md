# Tribün 2.0 — development candidate
Base: 20d43fa821a42103ed60969bfb63e4d94f147dd6. User reference: slate/blue-grey/pink dark UI; team colours only within club branding; native Android excluded. Do not merge before acceptance.

## Implemented in this candidate (not acceptance-tested)
- Compact featured cards, favorite team shortcuts, labeled navigation, tablet width, local compact preference, palette-consistent focus and controls, motion respecting reduced-motion.
- Score hiding in main match/featured lists (detail screens and OS notifications not hidden); on-demand favorite day digest; refresh.
- Match fan mode, actual score PNG share/download, calendar ICS for scheduled matches.
- Local football score predictions: no wagers, 3 exact/1 result points; settlement when provider reports a recognized final status and relevant date loads. No account, online leaderboard or multiplayer.
- Data-based summary (not AI), quarter cumulative basketball chart; football important-event distribution explicitly not attack momentum.
- Foreground Turkish goal narration (platform dependent). Existing notifications and APIs retained.
- Existing lower-league and official integrations remain unchanged; verify actual coverage and correctness.

## Remaining / blocked by data or backend
- Shot maps, true momentum, xG, heatmaps, ratings: only use licensed provider data where coordinates, timestamps and metric definitions are present. Never fabricate.
- Genuine multiuser polls, friends/leaderboards require authenticated accounts, server validation/anti-abuse and durable storage.
- AI summaries require server-side model and key, validated source-grounded prompts; currently deterministic summary only.
- Live projected standings need league tiebreaker rules and complete live fixtures. Smart push events and background speech require provider/OS support; background push sound not equivalent to foreground speech.
- Full interface redesign of all remaining profiles, detailed animations and pull-to-refresh still open.
- Verify real lower-league/Bursaspor and referee data, real push delivery, two-device sync, supported browsers.
- No production merge or comprehensive acceptance tests until all requested development is ready.
