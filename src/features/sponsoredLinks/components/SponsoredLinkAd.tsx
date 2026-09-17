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
/** Banners are a fixed 6:1 strip; the creative's own dimensions are informational. */
const BANNER_ASPECT_RATIO = 6

/** In-app profile route for the sponsor's AT account, if the ad names one. */
export function getSponsorProfileLink(
  sponsor: SponsoredLinkAdData['sponsor'],
): string | undefined {
  if (!sponsor.did && !sponsor.handle) return undefined
  return makeProfileLink({did: sponsor.did ?? '', handle: sponsor.handle ?? ''})
}

/**
 * The creative section of a sponsored link card. Not a box of its own: it
 * renders inside `SponsoredLinkEmbed`'s shared frame, on a grey ground that
 * sets it apart from the link card above it. Two link targets, deliberately
 * split: the sponsor's NAME (and logo) go to their profile, while the rest
 * of the creative - banner and copy - goes wherever the campaign links
 * (`ad.clickUrl`).
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

  const sponsorIdentity = ({hovered = false}: {hovered?: boolean}) => (
    <View style={[a.flex_row, a.align_center, a.gap_xs]}>
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
        style={[
          a.text_sm,
          a.font_bold,
          a.leading_snug,
          hovered && a.underline,
        ]}>
        {ad.sponsor.name}
      </Text>
    </View>
  )

  const creativeBody = ({
    hovered = false,
    pressed = false,
  }: {
    hovered?: boolean
    pressed?: boolean
  }) => (
    /*
     * `Link` is a centered flex row, so without an explicit width this view
     * would shrink to its content and the banner's 100% would be meaningless.
     */
    <View
      style={[
        a.flex_col,
        a.w_full,
        (hovered || pressed) && t.atoms.bg_contrast_50,
      ]}>
      <Image
        style={[a.w_full, {aspectRatio: BANNER_ASPECT_RATIO}]}
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

  return (
    <View style={[a.flex_col, a.w_full, t.atoms.bg_contrast_25, style]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.px_md, a.py_sm]}>
        {profileLink ? (
          <Link
            to={profileLink}
            label={l`Sponsored by ${ad.sponsor.name}. View the sponsor's profile`}
            style={[a.flex_shrink]}>
            {sponsorIdentity}
          </Link>
        ) : (
          sponsorIdentity({})
        )}
        <View style={[a.flex_1]} />
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
      {ad.clickUrl ? (
        <Link
          to={ad.clickUrl}
          label={l`Open the ${ad.sponsor.name} campaign`}
          style={[a.w_full]}>
          {creativeBody}
        </Link>
      ) : (
        creativeBody({})
      )}
    </View>
  )
}
