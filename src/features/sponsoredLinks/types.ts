import {z} from 'zod'

/**
 * A creative returned by the ad service for one sponsored link. This is the
 * wire format; the service contract is documented in README.md.
 */
export const sponsoredLinkAdSchema = z.object({
  /** Opaque creative identifier, for logging. */
  id: z.string().min(1),
  /** Rendered as a 6:1 strip (e.g. 2400x400). `width`/`height` are informational. */
  banner: z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
  }),
  sponsor: z.object({
    name: z.string().min(1),
    logoUrl: z.string().url().optional(),
    /** The sponsor's AT account. Either identifies the profile to link to. */
    did: z.string().startsWith('did:').optional(),
    handle: z.string().min(1).optional(),
  }),
  /** Short copy shown with the creative. */
  text: z.string(),
  /** Single-use URL that bypasses the paywall. Replaces the post's link. */
  giftUrl: z.string().url(),
  /** Where the campaign sends a click on the creative (banner and copy).
      The sponsor NAME always links to their profile instead. */
  clickUrl: z.string().url().optional(),
})

export type SponsoredLinkAd = z.infer<typeof sponsoredLinkAdSchema>

/** Body of a 200 response from `GET /v1/ad`. */
export const sponsoredLinkAdResponseSchema = z.object({
  ad: sponsoredLinkAdSchema,
})
