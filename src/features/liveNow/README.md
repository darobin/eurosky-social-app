# Live Now

"Go Live" attaches a temporary `app.bsky.actor.status` record (with an
external link embed) to an account. `useActorStatus` resolves whether it is
active for the viewer (expiry, allowed hosts, moderation).

## Where it shows up

- Avatars get a `LiveIndicator`; tapping one opens `LiveStatusDialog` (or
  `EditLiveDialog` for your own account). When the service has an inline live
  player the popup plays the stream itself; otherwise it shows the thumbnail.
  Either way it keeps an outbound "Watch on ..." / "Watch now" link.
- The web hover card reuses `LiveStatus` with `embedPlayer={false}`: hover
  cards are transient, so they stay a static preview.
- On the profile screen, the stream is also embedded above the Posts tab via
  `components/LiveEmbed.tsx`, so viewers can watch without leaving the app.

`useLiveEmbedPlayerParams` is the shared gate for all of these: it resolves the
player for a link and respects the viewer's Settings > External media choice.

## Inline players

`liveEmbedSources.ts` decides which live links get an inline player. It reuses
`parseEmbedPlayerFromUrl` (`src/lib/strings/embed-player.ts`) so a live source
is just another external-embed source: it inherits the per-service consent
dialog and the Settings > External media toggle, and the same link also plays
inline inside posts.

To add a service:

1. Add a URL parser to `parseEmbedPlayerFromUrl` that returns a `playerUri`
   for its embed page, plus the new `source`/`type`, its label, its persisted
   pref in `src/state/persisted/schema.ts`, and an aspect in `getPlayerAspect`.
2. List the new `EmbedPlayerType` in `LIVE_EMBED_PLAYER_TYPES`.

Currently only Streamplace (`stream.place/<handle>` ->
`stream.place/embed/<handle>`) is listed.
