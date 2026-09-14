
# Kobler Sponsored Links

Kobler Sponsored Links are a new advertising product in which a link to paywalled
content that is posted can be decorated with an ad, and links that get decorated
with an ad get transformed into gift links, bypassing the paywall.

The process operates as follows:

When a post that contains a link is about to be served by the AppView, its domain
is checked against an allow-list of domains that are opted into sponsored links.
When in production, this will be a more elaborate service; while in development
we can rely on a configurable list of domains that is hand-edited by the
developer.

If the link is not in the covered set, the link just gets rendered in the usual
way.

If the link is in the covered set, then the AppView will insert a flag to indicate
that in the data it returns to the client. The client, upon rendering the post,
will send the full URL of the link to a specific service to obtain an ad.

If the service doesn't have an ad for this link, it declines to return an ad and
the client renders the link as usual.

If the service has an ad, it returns the data for the creative: ad banner,
name of the sponsor, logo of the sponsor, AT account of the sponsor, short
text, and a single-use URL that bypasses the paywall. In this case, the client
renders the ad next to the link card and replaces the link with the provided URL.
