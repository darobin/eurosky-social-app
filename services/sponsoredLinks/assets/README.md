# Dev ad service assets

Drop image files here; the dev server serves them at `/assets/files/<name>`
(png, jpg, webp, gif, svg, avif).

Banners are shown as a 6:1 strip, so make them 6:1 (e.g. 2400x400); logos are
square. A file named `<slug>-banner.*` or `<slug>-logo.*` is picked up automatically
for that creative, replacing the generated SVG. An explicit `bannerUrl` /
`logoUrl` on the fixture still wins.
