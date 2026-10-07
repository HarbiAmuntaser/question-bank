# Pre-AdSense foundation

The advertising runtime is closed by default.

## Configuration

- `ADSENSE_ENABLED=false` prevents the AdSense script and every manual slot.
- `ADSENSE_PUBLISHER_ID` accepts only `pub-` followed by 16 digits.
- The publisher form is used in `ads.txt`.
- The derived `ca-pub-` form is used by the verification meta tag and AdSense client code.

When the publisher ID is absent or invalid, the verification meta tag is omitted and
`/ads.txt` returns 404. Enabling ads without a valid publisher ID also remains fail-closed.

## Site review

After receiving the real publisher ID:

1. Keep `ADSENSE_ENABLED=false`.
2. Set `ADSENSE_PUBLISHER_ID=pub-...` in the intended deployment environment.
3. Deploy and verify the `google-adsense-account` meta tag uses `ca-pub-...`.
4. Verify `/ads.txt` uses `pub-...`.
5. Request the AdSense site review.

No page currently mounts `AdsProvider` or `AdSlot`, so this foundation cannot serve
Auto Ads or manual ads. Actual placements, consent configuration, policy text updates,
and production activation require a separate approved rollout.

## Eligibility invariants

- Paid, mixed, unpublished, unknown, private, administrative and payment content is blocked.
- Interactive quiz play and targeted review are blocked.
- A free quiz intro or result may support a manual placement in a future rollout.
- Eligibility is based on server-owned content classification, never browser input or a
  visitor's entitlement.
