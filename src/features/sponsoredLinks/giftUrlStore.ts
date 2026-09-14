import {useSyncExternalStore} from 'react'

/*
 * Gift URLs obtained this session, keyed by the original link URL. The link
 * card fetches the ad; anything else that renders the same URL (the link facet
 * in the post text) reads from here so it never triggers an ad request of its
 * own. A plain store rather than query observers keeps the cost per rendered
 * link at one Map lookup.
 */
const giftUrls = new Map<string, string>()
const listeners = new Set<() => void>()

export function rememberGiftUrl(url: string, giftUrl: string) {
  giftUrls.set(url, giftUrl)
  listeners.forEach(listener => listener())
}

export function getGiftUrl(url: string): string | undefined {
  return giftUrls.get(url)
}

export function subscribeGiftUrls(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Reactive read of the gift URL known for `url`, if any. */
export function useGiftUrl(url: string): string | undefined {
  return useSyncExternalStore(subscribeGiftUrls, () => giftUrls.get(url))
}

/** Test helper. */
export function resetGiftUrls() {
  giftUrls.clear()
}
