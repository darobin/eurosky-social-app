import {type StyleProp, View, type ViewStyle} from 'react-native'
import {Image} from 'expo-image'
import {Trans, useLingui} from '@lingui/react/macro'

import {makeProfileLink} from '#/lib/routes/links'
import {atoms as a, useTheme} from '#/alf'
import {Unlock_Stroke2_Corner2_Rounded as Unlock} from '#/components/icons/Lock'
import {Sparkle_Stroke2_Corner0_Rounded as Sparkle} from '#/components/icons/Sparkle'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {type SponsoredLinkAd as SponsoredLinkAdData} from '../types'

const LOGO_SIZE = 20
const DEFAULT_BANNER_ASPECT_RATIO = 3

/** In-app profile route for the sponsor's AT account, if the ad names one. */
export function getSponsorProfileLink(
  sponsor: SponsoredLinkAdData['sponsor'],
): string | undefined {
  if (!sponsor.did && !sponsor.handle) return undefined
  return makeProfileLink({did: sponsor.did ?? '', handle: sponsor.handle ?? ''})
}

/**
 * The creative shown beneath a sponsored link card: sponsor logo and name, a
 * "Sponsored" marker, the banner, the sponsor's short copy, and a note that the
 * link is a gift. The whole panel links to the sponsor's profile when the ad
 * identifies their AT account.
 */
export function SponsoredLinkAd({
  ad,
  style,
}: {
  ad: SponsoredLinkAdData
  style?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const profileLink = getSponsorProfileLink(ad.sponsor)
  const bannerAspectRatio =
    ad.banner.width && ad.banner.height
      ? ad.banner.width / ad.banner.height
      : DEFAULT_BANNER_ASPECT_RATIO

  const renderPanel = ({
    hovered = false,
    pressed = false,
  }: {
    hovered?: boolean
    pressed?: boolean
  }) => (
    <View
      style={[
        a.transition_color,
        a.flex_col,
        a.rounded_md,
        a.overflow_hidden,
        a.w_full,
        a.border,
        t.atoms.bg_contrast_25,
        hovered || pressed
          ? t.atoms.border_contrast_high
          : t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.px_md, a.py_sm]}>
        {ad.sponsor.logoUrl ? (
          <Image
            style={[
              a.rounded_xs,
              {width: LOGO_SIZE, height: LOGO_SIZE},
              t.atoms.bg_contrast_50,
            ]}
            source={{uri: ad.sponsor.logoUrl}}
            accessibilityIgnoresInvertColors
            contentFit="cover"
          />
        ) : null}
        <Text
          emoji
          numberOfLines={1}
          style={[a.flex_1, a.text_sm, a.font_bold, a.leading_snug]}>
          {ad.sponsor.name}
        </Text>
        <View style={[a.flex_row, a.align_center, a.gap_2xs]}>
          <Sparkle size="xs" style={[t.atoms.text_contrast_medium]} />
          <Text
            style={[
              a.text_xs,
              a.font_semi_bold,
              a.leading_snug,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans context="Marker on an advertisement">Sponsored</Trans>
          </Text>
        </View>
      </View>
      <Image
        style={[a.w_full, {aspectRatio: bannerAspectRatio}]}
        source={{uri: ad.banner.url}}
        alt={ad.banner.alt}
        accessibilityIgnoresInvertColors
        contentFit="cover"
        loading="lazy"
      />
      <View style={[a.px_md, a.py_sm, a.gap_xs]}>
        {ad.text ? (
          <Text emoji style={[a.text_sm, a.leading_snug]}>
            {ad.text}
          </Text>
        ) : null}
        <View style={[a.flex_row, a.align_center, a.gap_2xs]}>
          <Unlock size="xs" style={[t.atoms.text_contrast_medium]} />
          <Text
            style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>Gift link – read this article without a paywall</Trans>
          </Text>
        </View>
      </View>
    </View>
  )

  if (!profileLink) {
    return <View style={style}>{renderPanel({})}</View>
  }

  return (
    <Link
      to={profileLink}
      label={l`Sponsored by ${ad.sponsor.name}. View the sponsor's profile`}
      style={[a.rounded_md, style]}>
      {renderPanel}
    </Link>
  )
}
