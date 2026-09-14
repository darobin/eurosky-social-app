import {View} from 'react-native'
import {moderateStatus} from '@bsky/sdk/moderation'
import {Trans, useLingui} from '@lingui/react/macro'

import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {externalEmbedLabels} from '#/lib/strings/embed-player'
import {toNiceDomain} from '#/lib/strings/url-helpers'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {SquareArrowTopRight_Stroke2_Corner0_Rounded as SquareArrowTopRightIcon} from '#/components/icons/SquareArrowTopRight'
import {createStaticClick, SimpleInlineLinkText} from '#/components/Link'
import * as Hider from '#/components/moderation/Hider'
import {useGlobalReportDialogControl} from '#/components/moderation/ReportDialog'
import {ExternalPlayer} from '#/components/Post/Embed/ExternalEmbed/ExternalPlayer'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {LivePill} from '#/features/liveNow/components/LiveIndicator'
import {ModeratedImage} from '#/features/liveNow/components/LiveStatusDialog'
import {useLiveEmbedPlayerParams} from '#/features/liveNow/useLiveEmbedPlayerParams'
import {type app} from '#/lexicons'
import type * as bsky from '#/types/bsky'

/**
 * Inline player for an account's active live status, shown at the top of
 * their profile feed. Renders nothing when the linked service has no inline
 * live player (see `liveEmbedSources.ts`) or the viewer has hidden that
 * service under Settings > External media, so the avatar popup stays the
 * fallback in both cases.
 *
 * Playback goes through `ExternalPlayer`, which keeps the usual external
 * media behavior: nothing loads until the viewer presses play, the
 * per-service consent dialog runs first, and the player stops when it
 * scrolls out of view or the screen blurs.
 */
export function LiveEmbed({
  profile,
  status,
  embed,
  isMe = false,
}: {
  profile: bsky.profile.AnyProfileView
  status: app.bsky.actor.defs.StatusView
  embed: app.bsky.embed.external.View
  isMe?: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const ax = useAnalytics()
  const openLink = useOpenLink()
  const moderationOpts = useModerationOpts()
  const reportDialogControl = useGlobalReportDialogControl()
  const params = useLiveEmbedPlayerParams(embed.external.uri)
  const moderation = moderationOpts
    ? moderateStatus(profile, moderationOpts)
    : undefined

  if (!params) return null

  const serviceName = externalEmbedLabels[params.source]

  return (
    <View
      testID="profileLiveEmbed"
      style={[
        a.px_md,
        a.pt_md,
        a.pb_sm,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          a.w_full,
          a.rounded_md,
          a.overflow_hidden,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg,
        ]}>
        <Hider.Outer modui={moderation?.ui('contentMedia')}>
          <Hider.Mask>
            <ModeratedImage />
          </Hider.Mask>
          <Hider.Content>
            <ExternalPlayer link={embed.external} params={params} />
          </Hider.Content>
        </Hider.Outer>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_md,
            a.p_md,
            a.border_t,
            t.atoms.border_contrast_low,
          ]}>
          <LivePill />
          <View style={[a.flex_1, a.gap_2xs]}>
            <Text
              emoji
              numberOfLines={2}
              style={[a.text_md, a.font_semi_bold, a.leading_snug]}>
              {embed.external.title || embed.external.uri}
            </Text>
            <View style={[a.flex_row, a.align_center, a.gap_xs]}>
              <GlobeIcon size="xs" style={[t.atoms.text_contrast_medium]} />
              <Text
                numberOfLines={1}
                style={[
                  a.text_xs,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                {toNiceDomain(embed.external.uri)}
              </Text>
              {!isMe && (
                <SimpleInlineLinkText
                  label={l`Report this livestream`}
                  {...createStaticClick(() => {
                    reportDialogControl.open({
                      subject: {
                        ...status,
                        $type: 'app.bsky.actor.defs#statusView',
                      },
                    })
                  })}
                  style={[
                    a.text_xs,
                    a.underline,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>Report</Trans>
                </SimpleInlineLinkText>
              )}
            </View>
          </View>
          <Button
            label={l`Watch on ${serviceName}`}
            size="small"
            color="secondary"
            onPress={() => {
              ax.metric('live:card:watch', {subject: profile.did})
              openLink(embed.external.uri, false)
            }}>
            <ButtonText>
              <Trans>Watch on {serviceName}</Trans>
            </ButtonText>
            <ButtonIcon icon={SquareArrowTopRightIcon} />
          </Button>
        </View>
      </View>
    </View>
  )
}
