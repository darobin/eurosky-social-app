/**
 * Fake sponsored-links ad service for local development.
 *
 * Stands in for the real ad service described in SPLINKS.md: the app sends it
 * the URL of a flagged link and it answers with a creative, or declines.
 * Zero dependencies. Creatives come from fixtures.json, which is re-read on
 * every request, so edit it and reload the post - no restart needed.
 *
 * Usage:
 *   node services/sponsoredLinks/dev-server.mjs
 *
 * Then point the app at it (already the default for web dev builds):
 *   EXPO_PUBLIC_SPONSORED_LINKS_SERVICE_URL=http://localhost:8789
 * and simulate the AppView flag for the fixture domains:
 *   EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS=nytimes.com,theguardian.com,ft.com
 *
 * Endpoints:
 *   GET /v1/ad?url=<link>   200 {ad} for a fixture domain, 204 otherwise.
 *                           Links whose path contains "no-ad" are always
 *                           declined, to exercise the fallback path.
 *   GET /gift/<token>       302 to the article the first time, 410 after
 *                           that: gift links are single-use.
 *   GET /assets/banner/<slug>.svg, /assets/logo/<slug>.svg   generated art
 *   GET /                   JSON index of fixtures and minted gift links
 *
 * Env: PORT (8789); SPONSORED_LINKS_LATENCY_MS (0) delays ad responses to
 * simulate a slow service.
 */
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import http from 'node:http'

const PORT = Number(process.env.PORT || 8789)
const LATENCY_MS = Number(process.env.SPONSORED_LINKS_LATENCY_MS || 0)
const FIXTURES_URL = new URL('./fixtures.json', import.meta.url)

const BANNER = {width: 1200, height: 400}
const LOGO = {size: 128}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
}

/** token -> {url, slug, mintedAt, usedAt} */
const giftLinks = new Map()

async function readFixtures() {
  const raw = await readFile(FIXTURES_URL, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.creatives) ? parsed.creatives : []
}

function findCreative(creatives, hostname) {
  return creatives.find(c =>
    (c.domains || []).some(d => {
      const domain = String(d).toLowerCase()
      return hostname === domain || hostname.endsWith('.' + domain)
    }),
  )
}

function escapeXml(s) {
  return String(s).replace(
    /[<>&"']/g,
    ch =>
      ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'})[
        ch
      ],
  )
}

function bannerSvg(creative) {
  const name = escapeXml(creative.sponsor?.name || creative.slug)
  const accent = creative.accent || '#334155'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER.width}" height="${BANNER.height}" viewBox="0 0 ${BANNER.width} ${BANNER.height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="1040" cy="200" r="150" fill="#fff" fill-opacity="0.12"/>
  <circle cx="1120" cy="80" r="70" fill="#fff" fill-opacity="0.12"/>
  <text x="60" y="190" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#fff">${name}</text>
  <text x="60" y="260" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#fff" fill-opacity="0.9">Sponsored - this story is on us</text>
  <text x="60" y="350" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#fff" fill-opacity="0.7">fake creative from services/sponsoredLinks/dev-server.mjs</text>
</svg>`
}

function logoSvg(creative) {
  const initial = escapeXml(
    (creative.sponsor?.name || creative.slug || '?').trim().charAt(0),
  )
  const accent = creative.accent || '#334155'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO.size}" height="${LOGO.size}" viewBox="0 0 ${LOGO.size} ${LOGO.size}">
  <rect width="100%" height="100%" rx="24" fill="${accent}"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#fff">${initial}</text>
</svg>`
}

function html(title, body) {
  return `<!doctype html><meta charset="utf-8"><title>${escapeXml(title)}</title>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; line-height: 1.5">
<h1>${escapeXml(title)}</h1>${body}</body>`
}

function send(res, status, headers, body) {
  res.writeHead(status, {...CORS, ...headers})
  res.end(body)
}

function sendJson(res, status, data) {
  send(
    res,
    status,
    {'Content-Type': 'application/json; charset=utf-8'},
    JSON.stringify(data, null, 2),
  )
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function handleAd(req, res, incoming, origin) {
  const target = incoming.searchParams.get('url')
  if (!target || !/^https?:\/\//i.test(target)) {
    sendJson(res, 400, {error: 'Missing or invalid url param'})
    return '400 bad url'
  }
  let hostname
  try {
    hostname = new URL(target).hostname.toLowerCase()
  } catch {
    sendJson(res, 400, {error: 'Unparseable url'})
    return '400 unparseable'
  }

  if (LATENCY_MS > 0) await sleep(LATENCY_MS)

  const creative = findCreative(await readFixtures(), hostname)
  if (!creative || /no-ad/i.test(new URL(target).pathname)) {
    send(res, 204, {}, '')
    return `204 no ad for ${hostname}`
  }

  const token = randomUUID()
  giftLinks.set(token, {
    url: target,
    slug: creative.slug,
    mintedAt: new Date().toISOString(),
    usedAt: null,
  })

  const ad = {
    id: `${creative.slug}:${token}`,
    banner: {
      url: creative.bannerUrl || `${origin}/assets/banner/${creative.slug}.svg`,
      alt:
        creative.bannerAlt ||
        `${creative.sponsor?.name || creative.slug} advertisement`,
      width: creative.bannerWidth || BANNER.width,
      height: creative.bannerHeight || BANNER.height,
    },
    sponsor: {
      name: creative.sponsor?.name || creative.slug,
      logoUrl: creative.logoUrl || `${origin}/assets/logo/${creative.slug}.svg`,
      ...(creative.sponsor?.did ? {did: creative.sponsor.did} : {}),
      ...(creative.sponsor?.handle ? {handle: creative.sponsor.handle} : {}),
    },
    text: creative.text || '',
    giftUrl: `${origin}/gift/${token}`,
  }
  sendJson(res, 200, {ad})
  return `200 ${creative.slug} for ${hostname}`
}

function handleGift(res, token) {
  const gift = giftLinks.get(token)
  if (!gift) {
    send(
      res,
      404,
      {'Content-Type': 'text/html; charset=utf-8'},
      html(
        'Unknown gift link',
        '<p>This token was not minted by the running dev server (it forgets everything on restart).</p>',
      ),
    )
    return '404 unknown gift'
  }
  if (gift.usedAt) {
    send(
      res,
      410,
      {'Content-Type': 'text/html; charset=utf-8'},
      html(
        'Gift link already used',
        `<p>Gift links are single-use. This one was redeemed at ${escapeXml(gift.usedAt)} for <code>${escapeXml(gift.url)}</code>.</p>`,
      ),
    )
    return '410 gift already used'
  }
  gift.usedAt = new Date().toISOString()
  send(res, 302, {Location: gift.url}, '')
  return `302 gift -> ${gift.url}`
}

async function handleAsset(res, kind, slug) {
  const creative = (await readFixtures()).find(c => c.slug === slug)
  if (!creative) {
    sendJson(res, 404, {error: `No creative with slug "${slug}"`})
    return '404 asset'
  }
  const svg = kind === 'banner' ? bannerSvg(creative) : logoSvg(creative)
  send(
    res,
    200,
    {'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store'},
    svg,
  )
  return `200 ${kind}`
}

async function handleIndex(res) {
  const creatives = await readFixtures()
  sendJson(res, 200, {
    service: 'sponsored-links dev server',
    endpoints: [
      'GET /v1/ad?url=<link>',
      'GET /gift/<token>',
      'GET /assets/banner/<slug>.svg',
      'GET /assets/logo/<slug>.svg',
    ],
    creatives: creatives.map(c => ({slug: c.slug, domains: c.domains})),
    giftLinks: Object.fromEntries(giftLinks),
  })
  return '200 index'
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }
  const origin = `http://${req.headers.host || `localhost:${PORT}`}`
  const incoming = new URL(req.url, origin)
  const {pathname} = incoming
  let outcome
  try {
    if (req.method !== 'GET') {
      sendJson(res, 405, {error: 'GET only'})
      outcome = '405'
    } else if (pathname === '/v1/ad') {
      outcome = await handleAd(req, res, incoming, origin)
    } else if (pathname.startsWith('/gift/')) {
      outcome = handleGift(res, pathname.slice('/gift/'.length))
    } else if (/^\/assets\/(banner|logo)\/[^/]+\.svg$/.test(pathname)) {
      const [, kind, file] = pathname.split('/').slice(1)
      outcome = await handleAsset(res, kind, file.replace(/\.svg$/, ''))
    } else if (pathname === '/') {
      outcome = await handleIndex(res)
    } else {
      sendJson(res, 404, {error: 'Not found'})
      outcome = '404'
    }
  } catch (err) {
    sendJson(res, 500, {error: String(err)})
    outcome = `500 ${err}`
  }
  console.log(`${req.method} ${pathname}${incoming.search} -> ${outcome}`)
})

server.listen(PORT, () => {
  console.log(`sponsored-links dev server on http://localhost:${PORT}`)
  if (LATENCY_MS > 0) console.log(`simulating ${LATENCY_MS}ms latency`)
})
