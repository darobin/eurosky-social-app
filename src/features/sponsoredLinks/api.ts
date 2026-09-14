import {Logger} from '#/logger'
import {SPONSORED_LINKS_SERVICE_URL} from './config'
import {type SponsoredLinkAd, sponsoredLinkAdResponseSchema} from './types'

const logger = Logger.create(Logger.Context.SponsoredLinks)

/** Builds the ad-service request URL for a post link. */
export function buildSponsoredLinkAdUrl(
  url: string,
  serviceUrl: string = SPONSORED_LINKS_SERVICE_URL,
): string {
  return `${serviceUrl.replace(/\/+$/, '')}/v1/ad?url=${encodeURIComponent(url)}`
}

/**
 * Validates an ad-service response body. Returns null (and logs) when the
 * payload does not match the contract, so a bad creative never breaks a post.
 */
export function parseSponsoredLinkAd(body: unknown): SponsoredLinkAd | null {
  const result = sponsoredLinkAdResponseSchema.safeParse(body)
  if (!result.success) {
    logger.warn('sponsored links: invalid ad payload', {
      issues: result.error.issues,
    })
    return null
  }
  return result.data.ad
}

/**
 * Asks the ad service for a creative for `url`. Resolves to null when the
 * service declines (204 or 404) or returns something unusable. Throws on
 * network and server errors so the query layer can try again on a later mount.
 */
export async function fetchSponsoredLinkAd(
  url: string,
  {signal, serviceUrl}: {signal?: AbortSignal; serviceUrl?: string} = {},
): Promise<SponsoredLinkAd | null> {
  const res = await fetch(buildSponsoredLinkAdUrl(url, serviceUrl), {
    headers: {Accept: 'application/json'},
    signal,
  })
  if (res.status === 204 || res.status === 404) {
    logger.debug('sponsored links: no ad', {url})
    return null
  }
  if (!res.ok) {
    throw new Error(`Sponsored links service responded ${res.status}`)
  }
  const body: unknown = await res.json()
  return parseSponsoredLinkAd(body)
}
