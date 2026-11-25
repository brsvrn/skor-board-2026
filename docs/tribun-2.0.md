# Tribün 2.0 — development candidate
Base: 20d43fa821a42103ed60969bfb63e4d94f147dd6. User reference: slate/blue-grey/pink dark UI; team colours only within club branding; native Android excluded. Do not merge before acceptance.

## Implemented in this candidate (not acceptance-tested)
- Compact featured cards, favorite team shortcuts, labeled navigation, tablet width, local compact preference, palette-consistent focus and controls, motion respecting reduced-motion.
- Score hiding in main match/featured lists (detail screens and OS notifications not hidden); on-demand favorite day digest; refresh.
- Match fan mode, actual score PNG share/download, calendar ICS for scheduled matches.
- Local football score predictions: no wagers, 3 exact/1 result points; settlement when provider reports a recognized final status and relevant date loads. No account, online leaderboard or multiplayer.
- Data-based summary (not AI), quarter cumulative basketball chart; football important-event distribution explicitly not attack momentum.
- Foreground Turkish goal narration (platform dependent). Existing notifications and APIs retained.
- Skeleton loading, pull-to-refresh on home, and foreground score pulse for followed goals added.
- Existing lower-league and official integrations remain unchanged; verify actual coverage and correctness.

## Remaining / blocked by data or backend
- Shot maps, true momentum, xG, heatmaps, ratings: only use licensed provider data where coordinates, timestamps and metric definitions are present. Never fabricate.
- Genuine multiuser polls, friends/leaderboards require authenticated accounts, server validation/anti-abuse and durable storage.
- AI summaries require server-side model and key, validated source-grounded prompts; currently deterministic summary only.
- Live projected standings need league tiebreaker rules and complete live fixtures. Smart push events and background speech require provider/OS support; background push sound not equivalent to foreground speech.
- Full interface redesign of all remaining profiles, full visual redesign across all remaining profiles still open.
- Verify real lower-league/Bursaspor and referee data, real push delivery, two-device sync, supported browsers.
- No production merge or comprehensive acceptance tests until all requested development is ready.

## Follow-up candidate
Provider-backed analytics UI and endpoints: documented DataSportsAPI shots/xG, momentum, ratings and player heatmaps. Free/Starter may return restricted; no simulated values. Provider removed AI commentary on 2026-11-21; optional Gemini server integration uses TRIBUN_AI_ENABLED=1, TRIBUN_GEMINI_API_KEY, TRIBUN_GEMINI_MODEL; no paid credentials were added. Private seven-day invite groups (40 members, 8 fixtures) and per-device outcome polls use Redis; scoring verifies source results. Conditional in-memory pre-match standings projection; no official tiebreak claim. Goal notification highlights for equalizer/late where minute exists. Real environment acceptance remains outstanding.
