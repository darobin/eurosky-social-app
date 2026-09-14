import {useQuery} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {fetchSponsoredLinkAd} from './api'
import {SPONSORED_LINKS_ENABLED} from './config'
import {rememberGiftUrl} from './giftUrlStore'
import {type SponsoredLinkAd} from './types'

const sponsoredLinkAdQueryKeyRoot = 'sponsoredLinkAd'
export const createSponsoredLinkAdQueryKey = (args: {url: string}) =>
  createQueryKey(sponsoredLinkAdQueryKeyRoot, args)

/**
 * Fetches the creative for a flagged link. `data` is the ad, `null` when the
 * service declined, and `undefined` while loading, on error, or when disabled.
 *
 * Gift URLs are single-use, so an ad is requested at most once per link per
 * session: never stale, never refetched in the background, and kept in cache
 * long enough that scrolling a post out of view and back does not mint a
 * second gift link.
 */
export function useSponsoredLinkAdQuery({
  url,
  enabled = true,
}: {
  url: string
  enabled?: boolean
}) {
  return useQuery<SponsoredLinkAd | null>({
    enabled: SPONSORED_LINKS_ENABLED && enabled && !!url,
    queryKey: createSponsoredLinkAdQueryKey({url}),
    queryFn: async ({signal}) => {
      const ad = await fetchSponsoredLinkAd(url, {signal})
      if (ad) rememberGiftUrl(url, ad.giftUrl)
      return ad
    },
    staleTime: STALE.INFINITY,
    gcTime: STALE.HOURS.ONE,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
