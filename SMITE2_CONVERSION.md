# SMITE 2 companion conversion

This branch starts a separate KazuCorp SMITE 2 companion from the integrated
Squadra PC, Android, cloud-vault, Discord-presence, and OBS-overlay framework.
The working Squadra runtime is intentionally unchanged in this first local
checkpoint.

## Safety boundary

- Conversion branch: `feature/smite-2-conversion`
- Framework base: `d49346f` (`feature/season-7`), which already contains the
  Android companion, encrypted cloud link, and desktop OBS overlay
- `main` and every remote feature branch remain unchanged
- The conversion branch is checkpointed only to
  `origin/feature/smite-2-conversion` with explicit permission. It must not be
  merged, opened as a pull request, released, deployed, or published without
  separate explicit permission
- SMITE 2 will use distinct storage keys, cloud payload identity, Tauri bundle
  identity, updater target, Discord application, and OBS port before it can run
  beside Squadra

## Approved data sources

| Source | Initial responsibility | Approved URL roots |
| --- | --- | --- |
| SmiteBrain | Top-ranked player builds and per-god build recommendations | `https://smitebrain.com`, `https://*.smitebrain.com` |
| SmiteSource | Player tracker, match history, rank/SR, gods, items, community builds, and hosted source artwork | `https://smitesource.com`, `https://*.smitesource.com` |

No other gameplay-data or build provider is permitted. In particular,
SMITEFire is excluded. Local user-created builds remain allowed because they
are user data rather than a third-party source.

The first source integration will use conservative caching, clear attribution,
and explicit adapters. It will not assume an undocumented API exists; HTML or
JSON parsing begins only after the public response shape and applicable site
rules have been verified.

## Framework migration map

| Existing framework | SMITE 2 conversion |
| --- | --- |
| React + Tauri desktop shell | Reuse |
| Android Tauri companion shell | Reuse |
| KazuCorp visual language and startup sequence | Reuse and retheme for SMITE 2 |
| Client-side encryption and Cloudflare vault transport | Reuse with a separate SMITE 2 payload and cryptographic namespace |
| Local build editor, share flow, and cache patterns | Reuse with gods, items, relics, aspects, roles, and modes |
| Discord IPC worker | Reuse with a new Discord application ID and SMITE 2 asset catalog |
| Localhost OBS server | Reuse with a separate port and SMITE 2 session fields |
| Squadra fighters, cards, Helpers, rank math, tracker parser, and storage | Replace; never migrate implicitly |

## First checkpoint

This checkpoint adds only:

- typed SMITE 2 domain contracts for gods, builds, players, rank, and matches;
- a strict allow-list for SmiteBrain and SmiteSource;
- safe URL builders for the approved public entry points; and
- tests that reject unapproved, insecure, credentialed, and look-alike URLs.

The existing Squadra app remains buildable and behaviorally untouched. The next
checkpoint can implement read-only source adapters behind these contracts,
followed by isolated SMITE 2 storage/cloud payloads and then the PC/Android UI.
