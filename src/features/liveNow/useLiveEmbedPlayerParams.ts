import {type EmbedPlayerParams} from '#/lib/strings/embed-player'
import {useExternalEmbedsPrefs} from '#/state/preferences'
import {getLiveEmbedPlayerParams} from '#/features/liveNow/liveEmbedSources'

/**
 * Player params for a live-status link, honoring the viewer's Settings >
 * External media choice: a service they have hidden yields undefined, so
 * callers fall back to the static thumbnail plus outbound link.
 */
export function useLiveEmbedPlayerParams(
  url: string,
): EmbedPlayerParams | undefined {
  const externalEmbedsPrefs = useExternalEmbedsPrefs()
  const params = getLiveEmbedPlayerParams(url)
  if (!params || externalEmbedsPrefs?.[params.source] === 'hide') {
    return undefined
  }
  return params
}
