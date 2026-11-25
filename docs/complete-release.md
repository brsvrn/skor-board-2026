# Tribün toplu sürüm planı
Base: 3a7f360db4bed5beb2a1e4b729aac1406a3eb7f2. Develop in this branch; do not promote until all implementation is complete and final checks pass.
1. Search: leagues, teams, players, referees; local league navigation and remote explicit search.
2. Basketball alerts: ESPN NBA/WNBA/NCAA and official EuroLeague/EuroCup; avoid cross-sport ID collisions, phase-based rather than every basket. Other basketball leagues remain coverage-dependent.
3. Turkish lower league squads, lineup player stats, injury/availability.
4. Referee career profile from match and search.
5. Transfers (recorded movements, not rumors), sports news (ESPN external source links), broadcasts (provider supplied, regional uncertainty).
6. Team recent form; light/dark/system theme.
7. Explicit cross-device favorites upload/download using random capability code; no subscription secrets/profile data; 90-day expiry.
8. Final source syntax, unit tests, browser render, API coverage and preview checks; then production only after validation. Actual live phone delivery requires real match/device; no fabricated coverage.
Free quota preserved: shared DS budget; no new paid service, no native APK.
