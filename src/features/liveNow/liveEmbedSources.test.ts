import {getLiveEmbedPlayerParams} from './liveEmbedSources'

describe('getLiveEmbedPlayerParams', () => {
  it('returns Streamplace player params for a stream link', () => {
    expect(getLiveEmbedPlayerParams('https://stream.place/iame.li')).toEqual({
      type: 'streamplace_live',
      source: 'streamplace',
      playerUri: 'https://stream.place/embed/iame.li',
    })
  })

  it('ignores embeddable services that are not listed as live sources', () => {
    expect(
      getLiveEmbedPlayerParams('https://www.youtube.com/watch?v=videoId'),
    ).toBeUndefined()
  })

  it('ignores links with no player at all', () => {
    expect(getLiveEmbedPlayerParams('https://example.com/live')).toBeUndefined()
    expect(getLiveEmbedPlayerParams('not a url')).toBeUndefined()
  })
})
