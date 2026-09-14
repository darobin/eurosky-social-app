# Sponsored links ad service (dev)

The client side of sponsored links (`src/features/sponsoredLinks`) asks an ad
service for a creative whenever it renders a link the AppView flagged. This
directory holds a zero-dependency fake of that service for local development.
The real service is operated by the ad partner; the contract both must honour
is documented in `src/features/sponsoredLinks/README.md`.

## Local dev

```bash
node services/sponsoredLinks/dev-server.mjs      # listens on :8789
```

Web dev builds default to `http://localhost:8789`, so only the simulated
AppView flag needs configuring in `.env`:

```bash
EXPO_PUBLIC_SPONSORED_LINKS_DEV_DOMAINS=nytimes.com,theguardian.com,ft.com
```

Any post whose link card points at one of those domains will now show a
creative from `fixtures.json`, and its link opens a single-use gift URL served
by this process (`/gift/<token>`: 302 once, 410 afterwards).

- Edit `fixtures.json` freely; it is re-read on every request.
- A link whose path contains `no-ad` is always declined (204), which exercises
  the plain-card fallback.
- `SPONSORED_LINKS_LATENCY_MS=1500 node ...` simulates a slow service.
- `curl localhost:8789/` lists the loaded creatives and every gift link minted
  so far.
- Banners and logos are generated SVGs unless a creative sets `bannerUrl` /
  `logoUrl`.

The server keeps gift tokens in memory only; restarting it invalidates them.
