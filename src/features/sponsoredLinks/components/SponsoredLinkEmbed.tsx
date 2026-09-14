import {type StyleProp, type ViewStyle} from 'react-native'

import {atoms as a} from '#/alf'
import {ExternalEmbed} from '#/components/Post/Embed/ExternalEmbed'
import {type app} from '#/lexicons'
import {useSponsoredLinkAdQuery} from '../queries'
import {SponsoredLinkAd} from './SponsoredLinkAd'

/**
 * Renders a flagged external link. Until the ad service answers (or when it
 * declines) this is upstream's plain link card. Once a creative arrives, the
 * card opens the gift URL instead of the paywalled link and the creative
 * renders beneath it.
 */
export function SponsoredLinkEmbed({
  link,
  onOpen,
  style,
}: {
  link: app.bsky.embed.external.ViewExternal
  onOpen?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const {data: ad} = useSponsoredLinkAdQuery({url: link.uri})
  return (
    <>
      <ExternalEmbed
        link={link}
        openUri={ad?.giftUrl}
        onOpen={onOpen}
        style={style}
      />
      {ad ? <SponsoredLinkAd ad={ad} style={[a.mt_xs]} /> : null}
    </>
  )
}
