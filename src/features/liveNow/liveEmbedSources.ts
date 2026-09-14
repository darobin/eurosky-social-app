import {
  type EmbedPlayerParams,
  type EmbedPlayerType,
  parseEmbedPlayerFromUrl,
} from '#/lib/strings/embed-player'

/**
 * Player types whose embed can play a livestream inline on a profile. This is
 * the single place to extend when another service gets an inline live player:
 * add its URL parser to `parseEmbedPlayerFromUrl` (so it also gets the
 * external-media consent and settings toggle for free) and list the resulting
 * type here.
 *
 * Only Streamplace for now. Twitch and YouTube are parsed already, but their
 * players are tuned for VODs/clips and need checking against the live case
 * before they are listed.
 */
export const LIVE_EMBED_PLAYER_TYPES: ReadonlySet<EmbedPlayerType> =
  new Set<EmbedPlayerType>(['streamplace_live'])

/**
 * Player params for a live-status link, or undefined when the link's service
 * has no inline live player (the avatar popup with the outbound link remains
 * the only way to watch in that case).
 */
export function getLiveEmbedPlayerParams(
  url: string,
): EmbedPlayerParams | undefined {
  const params = parseEmbedPlayerFromUrl(url)
  if (!params || !LIVE_EMBED_PLAYER_TYPES.has(params.type)) return undefined
  return params
}
