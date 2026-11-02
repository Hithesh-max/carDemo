# Validation results

Build checked 2 November 2026. Runtime: Node.js 24.22.1 on Linux. Browser: Playwright Chromium 141, headless. Tests use isolated databases and fictional demo accounts.

## Functional API tests

`npm test`: **2 tests passed**, with assertions covering:

- Buyer/dealer registration, login and logout; session cookies.
- Real group creation and initial membership, with zero seeded members.
- Duplicate joins, capacity limits, role restrictions and unauthenticated access.
- Socket.IO event delivery to a second client after membership changes.
- Dealer-only bidding, numeric validation, server total calculation and offer revision.
- Separate dealer ownership: another dealer creates their own offer rather than overwriting someone else's.
- Buyer membership and explicit consent required for interest.
- Stale bid version rejected; previous interest keeps the original amount/version.
- Message membership checks and preservation of literal untrusted text for safe client rendering.
- Saved car persistence and cross-origin mutation rejection.
- Server restart: users, sessions, groups, memberships, messages, saved cars and interests retained.
- Leaving a group removes its interest record.
- Expired groups reject joins, offers and messages.
- No password or buyer-email fields exposed in public group responses.

## Browser tests

`npm run test:ui`: **8 tests passed**.

| Assessed page      | 390px mobile | 768px tablet | 1440px desktop | axe WCAG A/AA violations |
| ------------------ | ------------ | ------------ | -------------- | ------------------------ |
| Home               | Pass         | Pass         | Pass           | 0                        |
| Car catalogue      | Pass         | Pass         | Pass           | 0                        |
| Car details        | Pass         | Pass         | Pass           | 0                        |
| Create group       | Pass         | Pass         | Pass           | 0                        |
| Group dashboard    | Pass         | Pass         | Pass           | 0                        |
| Bid comparison     | Pass         | Pass         | Pass           | 0                        |
| Showroom directory | Pass         | Pass         | Pass           | 0                        |
| Dealer entry page  | Pass         | Pass         | Pass           | 0                        |

Checks include headings, local images, page-width overflow and JavaScript runtime errors. Third-party map tile requests are deliberately blocked in responsive/a11y tests to keep tests repeatable; this exercises the graceful fallback. It does not establish that a particular map provider will be reachable during your presentation.

Additional browser tests verify:

- Two isolated browser contexts: buyer creates a group; dealer publishes; buyer sees live offer without refresh; buyer records interest; dealer's interest count updates live.
- Interest persists after page reload.
- HTML-like messages display literally rather than executing.
- Catalogue search/reset and two-car comparison.
- Comparison dialog closes using Escape.
- On-road arithmetic and zero-interest EMI case.
- Skip link receives keyboard focus and moves focus to main.
- Authenticated dealer form and account dialog: zero targeted axe violations at mobile width.
- A city without sourced listings displays an honest empty state and official locator link.

## Issues found and fixed

- Large intrinsic image width overflowed form/sidebar panels. Added responsive global image sizing; all three viewport tests now pass.
- An Escape key pressed during dialog entrance animation could be ignored. Removed the modal entrance transition; keyboard closure test passes.
- External map tiles intentionally blocked during testing were initially counted as failed local content images. Local-content checks now exclude provider tiles, and a dedicated test verifies the map error message and directory fallback.

## Measured contrast ratios

Calculated from the CSS hex colours with the WCAG relative-luminance formula:

| Pair                                |   Ratio |
| ----------------------------------- | ------: |
| Body text #132b28 on #f6f7f3        | 13.90:1 |
| Secondary text #52645e on #f6f7f3   |  5.84:1 |
| White text on primary green #165e45 |  7.72:1 |
| White heading on hero #112e26       | 14.56:1 |
| Dark text #112e26 on mint #d2efba   | 11.64:1 |

## Lighthouse evidence

All eight Lighthouse 13.6.0 desktop accessibility audits scored **100/100**, including the authenticated dealer workspace. Map tile requests were blocked for deterministic audits.

See `audits/results.json` and the corresponding HTML reports for actual per-page Lighthouse accessibility scores from the final run. The dealer audit uses an authenticated demo dealer session. These reports contain no real user data.

Actual score screenshots are included in `audits/screenshots/`, one per page, for the academic report template. Open each HTML report to inspect the complete audit. `npm run audit` regenerates them with an isolated seeded server. Automated scores do not establish full WCAG conformance; screen-reader usability, real-world devices and production integrations still need review.

## Scope limits

No production deployment, external dealership integration, real payments, live inventory or authoritative tax data were tested or claimed. Actual map tile availability depends on internet access and the tile service. The tests establish software behaviour with illustrative fixtures, not commercial deal validity.
