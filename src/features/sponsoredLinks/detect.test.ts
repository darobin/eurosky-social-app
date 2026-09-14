import {type app} from '#/lexicons'
import {
  getHostname,
  hasSponsoredLinkFlag,
  isSponsoredLinkCandidate,
  matchesSponsoredDomain,
} from './detect'

function makeView(
  partial: Record<string, unknown> = {},
): app.bsky.embed.external.ViewExternal {
  return {
    uri: 'https://www.nytimes.com/2026/09/14/technology/story.html',
    title: 'title',
    description: 'description',
    ...partial,
  }
}

describe('getHostname', () => {
  it('lowercases the host and drops ports and paths', () => {
    expect(getHostname('HTTPS://WWW.Example.com:8443/a?b=c')).toBe(
      'www.example.com',
    )
  })

  it('returns undefined for unparseable input', () => {
    expect(getHostname('not a url')).toBeUndefined()
    expect(getHostname('')).toBeUndefined()
  })
})

describe('matchesSponsoredDomain', () => {
  const domains = ['nytimes.com', 'FT.com']

  it('matches the bare domain and its subdomains', () => {
    expect(matchesSponsoredDomain('https://nytimes.com/x', domains)).toBe(true)
    expect(matchesSponsoredDomain('https://www.nytimes.com/x', domains)).toBe(
      true,
    )
    expect(
      matchesSponsoredDomain('https://cooking.nytimes.com/x', domains),
    ).toBe(true)
  })

  it('is case-insensitive on both sides', () => {
    expect(
      matchesSponsoredDomain('https://WWW.FT.COM/content/1', domains),
    ).toBe(true)
  })

  it('does not match partial labels or unrelated hosts', () => {
    expect(matchesSponsoredDomain('https://notnytimes.com/x', domains)).toBe(
      false,
    )
    expect(
      matchesSponsoredDomain('https://nytimes.com.evil.io/x', domains),
    ).toBe(false)
    expect(matchesSponsoredDomain('https://example.com/x', domains)).toBe(false)
  })

  it('ignores blank entries and invalid URLs', () => {
    expect(matchesSponsoredDomain('https://nytimes.com/x', ['', ' '])).toBe(
      false,
    )
    expect(matchesSponsoredDomain('nope', domains)).toBe(false)
    expect(matchesSponsoredDomain('https://nytimes.com/x', [])).toBe(false)
  })
})

describe('hasSponsoredLinkFlag', () => {
  it('is true only for a boolean true flag set by the AppView', () => {
    expect(hasSponsoredLinkFlag(makeView({sponsoredLink: true}))).toBe(true)
    expect(hasSponsoredLinkFlag(makeView({sponsoredLink: 'true'}))).toBe(false)
    expect(hasSponsoredLinkFlag(makeView({sponsoredLink: false}))).toBe(false)
    expect(hasSponsoredLinkFlag(makeView())).toBe(false)
  })
})

describe('isSponsoredLinkCandidate', () => {
  it('accepts an AppView-flagged link regardless of the dev list', () => {
    expect(
      isSponsoredLinkCandidate(
        makeView({uri: 'https://example.com/a', sponsoredLink: true}),
        [],
      ),
    ).toBe(true)
  })

  it('accepts a dev-listed domain when the AppView did not flag it', () => {
    expect(isSponsoredLinkCandidate(makeView(), ['nytimes.com'])).toBe(true)
  })

  it('rejects unflagged links off the dev list', () => {
    expect(isSponsoredLinkCandidate(makeView(), [])).toBe(false)
    expect(isSponsoredLinkCandidate(makeView(), ['ft.com'])).toBe(false)
  })
})
