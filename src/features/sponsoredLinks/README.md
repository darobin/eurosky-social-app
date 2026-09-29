# Sponsored links

Client side of the Sponsored Links product described in `SPLINKS.md`: a link to
paywalled content in a post can be decorated with an ad, and in exchange the
link is swapped for a gift URL that bypasses the paywall.

## Flow

1. The AppView checks each external link embed against an allow-list of opted-in
   domains and, when it matches, adds `sponsoredLink: true` to the
   `app.bsky.embed.external#viewExternal` object it returns.
2. When the client renders a flagged link card it sends the link's full URL to
   the ad service (`GET /v1/ad?url=...`).
3. If the service declines (204), the card renders as usual.
4. If the service returns a creative, the card opens the gift URL instead of the
   original link, the creative renders beneath the card, and the matching link
   facet in the post text opens the gift URL too.

While the request is in flight the plain card is shown, so nothing blocks on
the ad service.

## Layout

- `config.ts` - env vars and the AppView flag name.
- `detect.ts` - domain matching and the "should we ask for an ad" predicate.
- `types.ts` - zod schema of the creative (the wire contract).
- `api.ts` - the service request and response validation.
- `queries.ts` - `useSponsoredLinkAdQuery`, one request per link per session.
- `giftUrlStore.ts` - session map of link URL to gift URL for the text facet.
- `components/SponsoredLinkEmbed.tsx` - link card plus creative.
- `components/SponsoredLinkAd.tsx` - the creative panel.
- `components/SponsoredInlineLinkText.tsx` - facet link that swaps in the gift URL.

Upstream touchpoints, each marked `EUROSKY`:

- `src/components/Post/Embed/index.tsx` - the `link` case routes flagged links
  to `SponsoredLinkEmbed`.
- `src/components/Post/Embed/ExternalEmbed/index.tsx` - new `openUri` prop to
  open a different URL from the one displayed.
- `src/components/RichText.tsx` - link facets render through
  `SponsoredInlineLinkText`.

## Ad service contract

`GET {SERVICE_URL}/v1/ad?url={encoded link URL}` with `Accept: application/json`.

| Status    | Meaning                                              |
| --------- | ---------------------------------------------------- |
| 200       | A creative, body `{"ad": {...}}` as below            |
| 204 / 404 | No ad for this link; render the plain card           |
| other     | Treated as transient; retried on a later render      |

```json
{
  "ad": {
    "id": "creative-123",
    "banner": {"url": "https://...", "alt": "...", "width": 2400, "height": 400},
    "sponsor": {
      "name": "North Star Bank",
      "logoUrl": "https://...",
      "did": "did:plc:...",
      "handle": "northstar.example.com"
    },
    "text": "North Star Bank unlocked this story for you.",
    "giftUrl": "https://.../gift/abc",
    "clickUrl": "https://northstar.example.com/campaign"
  }
}
```

Banners are rendered as a 6:1 strip (e.g. 2400x400), cropped to fit if the
image is not. `banner.alt`, `banner.width`/`height` (informational),
`sponsor.logoUrl`, `sponsor.did`, `sponsor.handle` and `clickUrl` are optional.
The link card and the creative share one box: the creative sits beneath the
card on a grey ground behind a dividing rule. The sponsor's NAME links to
their profile (when a DID or handle is present); the rest of the creative -
banner and copy - links to `clickUrl`, the campaign's own destination. Payloads that
fail validation are logged (`EXPO_PUBLIC_LOG_DEBUG=sponsored-links`) and
treated as "no ad".

## Single-use gift URLs

Every request may mint a gift URL, so the query never goes stale, never
refetches in the background, and stays cached for an hour after the post
leaves the screen. The gift URL is opened directly: no redirect proxy and no iOS
peek preview, either of which would consume it. Sharing a sponsored card still
shares the original link.

## Configuration

| Var                                        | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `EXPO_PUBLIC_SPONSORED_LINKS_SERVICE_URL`  | ad service base URL (web dev default: localhost:8789) |
| `EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS`  | dev only: domains treated as AppView-flagged         |
| `EXPO_PUBLIC_SPONSORED_LINKS_FORCE_DEV_DOMAINS` | `true` lets a release build honour the list above (demo deployments only) |
| `EXPO_PUBLIC_ENABLE_SPONSORED_LINKS`       | kill switch (`false` to force off)                   |

The feature is off whenever no service URL is configured.

## Local development

Nothing upstream flags links yet, so development uses two stand-ins:

- the hand-edited `EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS` list plays the
  AppView's allow-list (only honoured in `__DEV__` builds, or in a release
  build that sets `EXPO_PUBLIC_SPONSORED_LINKS_FORCE_DEV_DOMAINS=true`), and
- `services/sponsoredLinks/dev-server.mjs` plays the ad service, with fake
  creatives in `services/sponsoredLinks/fixtures.json` and working single-use
  gift redirects. See `services/sponsoredLinks/README.md`.

```bash
node services/sponsoredLinks/dev-server.mjs
# .env
EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS=nytimes.com,theguardian.com,ft.com
```

Then open any feed post linking to one of those domains. Unit tests cover
detection, the service client, and the gift-URL store (`pnpm test -- sponsoredLinks`).

## Known limitations

- Only the plain link card is decorated. Custom embeds and `standard.site`
  publication cards take precedence in the embed dispatcher and are never
  sponsored, even when flagged.
- Gift URLs are keyed by link URL for the session, so two posts linking to the
  same article share one gift URL, and the text facet of a post without a
  link card is only swapped if some other post's card already fetched the ad.
- Native dev builds cannot reach `localhost`; set the service URL to the
  machine's LAN address.
