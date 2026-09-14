import {type app} from '#/lexicons'
import {
  SPONSORED_LINK_FLAG,
  SPONSORED_LINKS_DEV_DOMAINS,
  SPONSORED_LINKS_ENABLED,
} from './config'

type ViewExternal = app.bsky.embed.external.ViewExternal

/** Lowercased hostname of `url`, or undefined when it does not parse. */
export function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * True when the host of `url` is one of `domains` or a subdomain of one.
 * Comparison is case-insensitive and label-aware, so `notexample.com` does not
 * match `example.com` while `www.example.com` does.
 */
export function matchesSponsoredDomain(
  url: string,
  domains: readonly string[],
): boolean {
  const hostname = getHostname(url)
  if (!hostname) return false
  return domains.some(entry => {
    const domain = entry.trim().toLowerCase()
    if (!domain) return false
    return hostname === domain || hostname.endsWith('.' + domain)
  })
}

/**
 * True when the AppView marked this embed as eligible for a sponsored link.
 * The flag is an extra boolean on the lexicon object rather than part of the
 * generated type, so it is read defensively.
 */
export function hasSponsoredLinkFlag(view: ViewExternal): boolean {
  return (view as Record<string, unknown>)[SPONSORED_LINK_FLAG] === true
}

/**
 * Whether the client should ask the ad service about this link: either the
 * AppView flagged it, or (dev only) its domain is in the hand-edited list.
 */
export function isSponsoredLinkCandidate(
  view: ViewExternal,
  devDomains: readonly string[] = SPONSORED_LINKS_DEV_DOMAINS,
): boolean {
  return (
    hasSponsoredLinkFlag(view) ||
    (devDomains.length > 0 && matchesSponsoredDomain(view.uri, devDomains))
  )
}

/** Feature-gated check for the upstream embed dispatcher. */
export function shouldDecorateSponsoredLink(view: ViewExternal): boolean {
  return SPONSORED_LINKS_ENABLED && isSponsoredLinkCandidate(view)
}
