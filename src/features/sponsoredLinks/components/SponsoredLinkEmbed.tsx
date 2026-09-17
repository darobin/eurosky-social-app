import {type StyleProp, View, type ViewStyle} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {ExternalEmbed} from '#/components/Post/Embed/ExternalEmbed'
import {type app} from '#/lexicons'
import {useSponsoredLinkAdQuery} from '../queries'
import {SponsoredLinkAd} from './SponsoredLinkAd'

/**
 * Renders a flagged external link. Until the ad service answers (or when it
 * declines) this is upstream's plain link card. Once a creative arrives, the
 * card and the creative share ONE box: the link card on top (opening the
 * gift URL), the creative beneath it on a grey ground behind a dividing
 * rule.
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
  const t = useTheme()
  const {data: ad} = useSponsoredLinkAdQuery({url: link.uri})
  if (!ad) {
    return <ExternalEmbed link={link} onOpen={onOpen} style={style} />
  }
  return (
    <View
      style={[
        a.flex_col,
        a.w_full,
        a.rounded_md,
        a.overflow_hidden,
        a.border,
        t.atoms.border_contrast_low,
        style,
      ]}>
      <ExternalEmbed
        link={link}
        openUri={ad.giftUrl}
        onOpen={onOpen}
        style={[{borderWidth: 0, borderRadius: 0}]}
      />
      <View style={[a.border_t, t.atoms.border_contrast_low]}>
        <SponsoredLinkAd ad={ad} />
      </View>
    </View>
  )
}
