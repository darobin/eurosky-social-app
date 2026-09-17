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
 *   GET /v1/ad?url=<link>   200 {ad} for a fixture domain (one at random
 *                           when several match), 204 otherwise. Links whose
 *                           path contains "no-ad" are always declined, to
 *                           exercise the fallback path.
 *   GET /gift/<token>       302 to the article the first time, 410 after
 *                           that: gift links are single-use.
 *   GET /assets/banner/<slug>.svg, /assets/logo/<slug>.svg   generated art
 *   GET /assets/files/<name>   files dropped into ./assets/ — one named
 *                           <slug>-banner.* or <slug>-logo.* is used for
 *                           that creative automatically.
 *   GET /campaign/<slug>    stand-in campaign landing page (the default
 *                           click-through when a creative sets no clickUrl)
 *   GET /                   JSON index of fixtures and minted gift links
 *
 * Env: PORT (8789); SPONSORED_LINKS_LATENCY_MS (0) delays ad responses to
 * simulate a slow service.
 */
import {randomUUID} from 'node:crypto'
import {readdir, readFile} from 'node:fs/promises'
import http from 'node:http'
import {extname} from 'node:path'

const PORT = Number(process.env.PORT || 8789)
const LATENCY_MS = Number(process.env.SPONSORED_LINKS_LATENCY_MS || 0)
const FIXTURES_URL = new URL('./fixtures.json', import.meta.url)
const ASSETS_URL = new URL('./assets/', import.meta.url)

/** Banners are a 6:1 strip. Generated art uses these dimensions. */
const BANNER = {width: 1200, height: 200}
const LOGO = {size: 128}

const ASSET_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
}

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

/** All creatives whose domain list covers the hostname. */
function matchingCreatives(creatives, hostname) {
  return creatives.filter(c =>
    (c.domains || []).some(d => {
      const domain = String(d).toLowerCase()
      return hostname === domain || hostname.endsWith('.' + domain)
    }),
  )
}

/** One of the matches, at random - several sponsors can share a domain. */
function pickCreative(creatives, hostname) {
  const matches = matchingCreatives(creatives, hostname)
  if (matches.length === 0) return undefined
  return matches[Math.floor(Math.random() * matches.length)]
}

/** A file dropped into ./assets/ named `<slug>-banner.*` or `<slug>-logo.*`
    beats the generated SVG for that creative. */
async function assetFileFor(slug, kind) {
  let names
  try {
    names = await readdir(ASSETS_URL)
  } catch {
    return undefined
  }
  const prefix = `${slug}-${kind}`.toLowerCase()
  return names.find(n => {
    const ext = extname(n).toLowerCase()
    return ASSET_TYPES[ext] && n.slice(0, -ext.length).toLowerCase() === prefix
  })
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

/* ——— generated art: ink color chosen for contrast with the accent ——— */

function parseHexColor(hex) {
  const m = String(hex || '')
    .trim()
    .match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return [0x33, 0x41, 0x55] // the default accent
  let h = m[1]
  if (h.length === 3) h = [...h].map(ch => ch + ch).join('')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
}

/** WCAG relative luminance of an sRGB color. */
function luminance([r, g, b]) {
  const lin = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/**
 * The text (and decoration) color to draw over `accent`: whichever of white
 * and near-black contrasts more (WCAG contrast ratio), so a pale yellow gets
 * dark text instead of illegible white.
 */
function inkFor(accent) {
  const bg = luminance(parseHexColor(accent))
  const contrastWithWhite = 1.05 / (bg + 0.05)
  const contrastWithBlack = (bg + 0.05) / 0.05
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#0f172a'
}

function bannerSvg(creative) {
  const name = escapeXml(creative.sponsor?.name || creative.slug)
  const accent = creative.accent || '#334155'
  const ink = inkFor(accent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BANNER.width}" height="${BANNER.height}" viewBox="0 0 ${BANNER.width} ${BANNER.height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="1060" cy="100" r="80" fill="${ink}" fill-opacity="0.1"/>
  <circle cx="1140" cy="40" r="36" fill="${ink}" fill-opacity="0.1"/>
  <text x="40" y="92" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="${ink}">${name}</text>
  <text x="40" y="136" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="${ink}" fill-opacity="0.9">Sponsored - this story is on us</text>
  <text x="40" y="178" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="${ink}" fill-opacity="0.7">fake creative from services/sponsoredLinks/dev-server.mjs</text>
</svg>`
}

/**
 * Intrinsic size of a dropped-in banner file, so the ad reports what it
 * really serves. SVGs are read from width/height or the viewBox; PNGs from the
 * IHDR chunk; anything else falls back to the 6:1 default.
 */
async function bannerFileDimensions(name) {
  try {
    const bytes = await readFile(new URL(name, ASSETS_URL))
    if (extname(name).toLowerCase() === '.svg') {
      const head = bytes.toString('utf8', 0, 2048)
      const tag = head.match(/<svg\b[^>]*>/i)?.[0] || ''
      const attr = key =>
        parseFloat(tag.match(new RegExp(`\\s${key}="([\\d.]+)`, 'i'))?.[1])
      const w = attr('width')
      const h = attr('height')
      if (w > 0 && h > 0) return {width: w, height: h}
      const vb = tag.match(
        /viewBox="[\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/i,
      )
      if (vb) return {width: parseFloat(vb[1]), height: parseFloat(vb[2])}
    } else if (
      extname(name).toLowerCase() === '.png' &&
      bytes.length >= 24 &&
      bytes.toString('ascii', 1, 4) === 'PNG'
    ) {
      return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)}
    }
  } catch {
    // fall through to the default
  }
  return BANNER
}

function logoSvg(creative) {
  const initial = escapeXml(
    (creative.sponsor?.name || creative.slug || '?').trim().charAt(0),
  )
  const accent = creative.accent || '#334155'
  const ink = inkFor(accent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO.size}" height="${LOGO.size}" viewBox="0 0 ${LOGO.size} ${LOGO.size}">
  <rect width="100%" height="100%" rx="24" fill="${accent}"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="${ink}">${initial}</text>
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

  const creative = pickCreative(await readFixtures(), hostname)
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

  const bannerFile = await assetFileFor(creative.slug, 'banner')
  const bannerSize = bannerFile
    ? await bannerFileDimensions(bannerFile)
    : BANNER
  const logoFile = await assetFileFor(creative.slug, 'logo')
  const ad = {
    id: `${creative.slug}:${token}`,
    banner: {
      url:
        creative.bannerUrl ||
        (bannerFile
          ? `${origin}/assets/files/${bannerFile}`
          : `${origin}/assets/banner/${creative.slug}.svg`),
      alt:
        creative.bannerAlt ||
        `${creative.sponsor?.name || creative.slug} advertisement`,
      width: creative.bannerWidth || bannerSize.width,
      height: creative.bannerHeight || bannerSize.height,
    },
    sponsor: {
      name: creative.sponsor?.name || creative.slug,
      logoUrl:
        creative.logoUrl ||
        (logoFile
          ? `${origin}/assets/files/${logoFile}`
          : `${origin}/assets/logo/${creative.slug}.svg`),
      ...(creative.sponsor?.did ? {did: creative.sponsor.did} : {}),
      ...(creative.sponsor?.handle ? {handle: creative.sponsor.handle} : {}),
    },
    text: creative.text || '',
    giftUrl: `${origin}/gift/${token}`,
    clickUrl: creative.clickUrl || `${origin}/campaign/${creative.slug}`,
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

/** A file from ./assets/ - the drop-in place for real art. */
async function handleAssetFile(res, name) {
  const ext = extname(name).toLowerCase()
  const type = ASSET_TYPES[ext]
  if (!type || name.includes('/') || name.includes('..')) {
    sendJson(res, 404, {error: 'Not found'})
    return '404 asset file'
  }
  let bytes
  try {
    bytes = await readFile(new URL(name, ASSETS_URL))
  } catch {
    sendJson(res, 404, {
      error: `No file "${name}" in services/sponsoredLinks/assets/`,
    })
    return '404 asset file'
  }
  send(res, 200, {'Content-Type': type, 'Cache-Control': 'no-store'}, bytes)
  return `200 asset ${name}`
}

/** Where a click on the creative lands when the fixture sets no clickUrl. */
async function handleCampaign(res, slug) {
  const creative = (await readFixtures()).find(c => c.slug === slug)
  if (!creative) {
    sendJson(res, 404, {error: `No creative with slug "${slug}"`})
    return '404 campaign'
  }
  const name = creative.sponsor?.name || creative.slug
  send(
    res,
    200,
    {'Content-Type': 'text/html; charset=utf-8'},
    html(
      `${name} - campaign`,
      `<p>This is the stand-in landing page for the <strong>${escapeXml(name)}</strong> campaign.</p>
<p>The real service would send the campaign's own click-through URL in <code>ad.clickUrl</code>;
set <code>clickUrl</code> on the fixture to try one.</p>`,
    ),
  )
  return `200 campaign ${slug}`
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
      'GET /assets/files/<name>',
      'GET /campaign/<slug>',
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
    } else if (pathname.startsWith('/assets/files/')) {
      outcome = await handleAssetFile(
        res,
        decodeURIComponent(pathname.slice('/assets/files/'.length)),
      )
    } else if (/^\/assets\/(banner|logo)\/[^/]+\.svg$/.test(pathname)) {
      const [, kind, file] = pathname.split('/').slice(1)
      outcome = await handleAsset(res, kind, file.replace(/\.svg$/, ''))
    } else if (pathname.startsWith('/campaign/')) {
      outcome = await handleCampaign(res, pathname.slice('/campaign/'.length))
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
