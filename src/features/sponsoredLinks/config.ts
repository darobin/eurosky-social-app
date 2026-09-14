/**
 * Sponsored links configuration. See README.md in this directory.
 *
 * In production the AppView flags eligible links and a real ad service returns
 * creatives. In development the flag is simulated with a hand-edited domain
 * list and the service by `services/sponsoredLinks/dev-server.mjs`.
 */
import {IS_WEB} from '#/env'

const DEV_SERVICE_URL = 'http://localhost:8789'

function csv(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Base URL of the ad service. Web dev builds fall back to the local fake
 * service so the feature works out of the box once that server is running.
 */
export const SPONSORED_LINKS_SERVICE_URL =
  process.env.EXPO_PUBLIC_SPONSORED_LINKS_SERVICE_URL ||
  (__DEV__ && IS_WEB ? DEV_SERVICE_URL : '')

/**
 * Whether sponsored links are active. Requires a service URL and respects an
 * explicit kill switch (EXPO_PUBLIC_ENABLE_SPONSORED_LINKS=false).
 */
export const SPONSORED_LINKS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_SPONSORED_LINKS !== 'false' &&
  !!SPONSORED_LINKS_SERVICE_URL

/**
 * Dev-only: domains treated as if the AppView had flagged them, so the client
 * path can be exercised against an AppView that knows nothing about sponsored
 * links. Gated on __DEV__ so it can't ship on.
 */
export const SPONSORED_LINKS_DEV_DOMAINS: readonly string[] = __DEV__
  ? csv(process.env.EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS)
  : []

/**
 * Name of the boolean the AppView adds to `app.bsky.embed.external#viewExternal`
 * when the link's domain is opted into sponsored links.
 */
export const SPONSORED_LINK_FLAG = 'sponsoredLink'
