import {
  buildSponsoredLinkAdUrl,
  fetchSponsoredLinkAd,
  parseSponsoredLinkAd,
} from './api'

jest.mock('#/logger', () => {
  const noop = () => {}
  return {
    Logger: {
      Context: {SponsoredLinks: 'sponsored-links'},
      create: () => ({debug: noop, info: noop, warn: noop, error: noop}),
    },
  }
})

const SERVICE = 'http://ads.test'
const LINK = 'https://www.nytimes.com/2026/09/14/story.html?a=1&b=2'

const validAd = {
  id: 'creative-1',
  banner: {
    url: 'http://ads.test/banner.svg',
    alt: 'Banner',
    width: 3,
    height: 1,
  },
  sponsor: {name: 'North Star Bank', logoUrl: 'http://ads.test/logo.svg'},
  text: 'Unlocked for you.',
  giftUrl: 'http://ads.test/gift/abc',
}

function mockResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

describe('buildSponsoredLinkAdUrl', () => {
  it('encodes the link as a query param under /v1/ad', () => {
    expect(buildSponsoredLinkAdUrl(LINK, SERVICE)).toBe(
      `${SERVICE}/v1/ad?url=${encodeURIComponent(LINK)}`,
    )
  })

  it('tolerates a trailing slash on the service URL', () => {
    expect(buildSponsoredLinkAdUrl(LINK, `${SERVICE}/`)).toBe(
      `${SERVICE}/v1/ad?url=${encodeURIComponent(LINK)}`,
    )
  })
})

describe('parseSponsoredLinkAd', () => {
  it('returns the ad for a well-formed payload', () => {
    expect(parseSponsoredLinkAd({ad: validAd})).toEqual(validAd)
  })

  it('accepts a sponsor identified by DID and/or handle', () => {
    const ad = {
      ...validAd,
      sponsor: {name: 'X', did: 'did:plc:abc', handle: 'x.example.com'},
    }
    expect(parseSponsoredLinkAd({ad})).toEqual(ad)
  })

  it('rejects payloads missing required fields or with bad URLs', () => {
    expect(parseSponsoredLinkAd({})).toBeNull()
    expect(parseSponsoredLinkAd({ad: {...validAd, giftUrl: 'nope'}})).toBeNull()
    expect(
      parseSponsoredLinkAd({ad: {...validAd, sponsor: {name: ''}}}),
    ).toBeNull()
    expect(
      parseSponsoredLinkAd({ad: {...validAd, sponsor: {name: 'X', did: 'x'}}}),
    ).toBeNull()
  })
})

describe('fetchSponsoredLinkAd', () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock
  })

  it('requests the ad for the link and returns it', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, {ad: validAd}))
    await expect(
      fetchSponsoredLinkAd(LINK, {serviceUrl: SERVICE}),
    ).resolves.toEqual(validAd)
    expect(fetchMock).toHaveBeenCalledWith(
      buildSponsoredLinkAdUrl(LINK, SERVICE),
      expect.objectContaining({headers: {Accept: 'application/json'}}),
    )
  })

  it('returns null when the service declines', async () => {
    fetchMock.mockResolvedValue(mockResponse(204))
    await expect(
      fetchSponsoredLinkAd(LINK, {serviceUrl: SERVICE}),
    ).resolves.toBeNull()
    fetchMock.mockResolvedValue(mockResponse(404))
    await expect(
      fetchSponsoredLinkAd(LINK, {serviceUrl: SERVICE}),
    ).resolves.toBeNull()
  })

  it('returns null for an unusable creative', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, {ad: {id: 'x'}}))
    await expect(
      fetchSponsoredLinkAd(LINK, {serviceUrl: SERVICE}),
    ).resolves.toBeNull()
  })

  it('throws on server errors so the query can retry later', async () => {
    fetchMock.mockResolvedValue(mockResponse(503))
    await expect(
      fetchSponsoredLinkAd(LINK, {serviceUrl: SERVICE}),
    ).rejects.toThrow('503')
  })
})
