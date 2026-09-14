import {type InlineLinkProps, InlineLinkText} from '#/components/Link'
import {SPONSORED_LINKS_ENABLED} from '../config'
import {useGiftUrl} from '../giftUrlStore'

type Props = InlineLinkProps & {to: string}

/**
 * Drop-in for `InlineLinkText` on link facets in post text. When the post's
 * link card has obtained a gift URL for the same URL, the facet opens that
 * instead of the paywalled original. Reads the session's gift-URL store only,
 * so it never triggers an ad request on its own.
 */
export function SponsoredInlineLinkText(props: Props) {
  if (!SPONSORED_LINKS_ENABLED) {
    return <InlineLinkText {...props} />
  }
  return <GiftAwareInlineLinkText {...props} />
}

function GiftAwareInlineLinkText({to, ...props}: Props) {
  const giftUrl = useGiftUrl(to)
  if (!giftUrl) {
    return <InlineLinkText to={to} {...props} />
  }
  /*
   * The visible text still names the publisher while the href is the gift URL,
   * which would trip the link-mismatch warning. The swap is made by the app
   * against its own trusted service, so the warning is suppressed, and the
   * single-use URL is opened directly rather than through the redirect proxy.
   */
  return (
    <InlineLinkText
      {...props}
      to={giftUrl}
      disableMismatchWarning
      shouldProxy={false}
    />
  )
}
