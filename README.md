# AutoCollective India

A runnable Web Technology project for group car buying and live dealer bidding. Eight HTML5 pages use Bootstrap 5.3.8, custom CSS and vanilla JavaScript. Express, Socket.IO and SQLite supply the backend.

## Run on your computer

1. Install **Node.js 24 LTS** (24 or later is required for built-in SQLite).
2. Extract the ZIP. Open a terminal in the `autocollective` folder containing `package.json`.
3. Run:

```sh
npm ci
npm start
```

4. Open **http://localhost:3000** in your browser. Do not double-click an HTML file; the API must be running.

Windows: open the extracted folder in File Explorer, type `cmd` in the address bar, press Enter, then run the commands. Stop the server with Ctrl+C. There is no separate database setup, cloud account or API key.

Use `npm run dev` for automatic server restarts during development. Client changes appear after a browser refresh.

## Demonstrate the full workflow

1. Open a normal browser window. Sign in → **Try as buyer**, or create a buyer account.
2. Open **Buying groups → Create a group**. Choose a car and city, accept the prototype notice and create it. New groups contain only your membership, with no seeded members.
3. Copy the group URL. Open it in a second browser profile using a different buyer account to demonstrate membership updates.
4. Open an **incognito window** → **For dealers → Sign in as a demo dealer → Try as dealer**. Separate windows in the same browser profile share cookies; use incognito or another browser for different roles.
5. Select the newly created group, enter price components, delivery and conditions, and publish the offer.
6. Watch the offer appear in the original buyer window without refreshing.
7. As the buyer, compare offers, review one, check the non-binding consent box and confirm interest.
8. The dealer sees an anonymous interest count live. Revise an offer to demonstrate version checking; old interests remain attached to old terms.
9. Refresh or restart the server: accounts, groups, offers, messages and interests persist.

**Seeded accounts** (for local classroom demonstration only):

| Role     | Email             | Password        |
| -------- | ----------------- | --------------- |
| Buyer    | buyer@demo.test   | Collective2026! |
| Dealer 1 | dealer1@demo.test | Collective2026! |
| Dealer 2 | dealer2@demo.test | Collective2026! |
| Dealer 3 | dealer3@demo.test | Collective2026! |

You can create separate buyer and unverified demo dealer accounts. Passwords are scrypt-hashed; sessions use HttpOnly SameSite cookies. Seeded demo logins are shared, so their activity is visible to everyone using them.

## What works

- Six real model identities, searchable catalogue, brand/budget/transmission/body-style filters and sorting.
- Server-persisted saved cars; compare up to three demo configurations.
- Editable on-road estimate and reducing-balance EMI calculator, including zero-interest handling.
- Create/join/leave a group; duplicate joins, group capacity and expiry checks on the server.
- Itemised dealer bids with server-calculated totals, versioned updates and ownership by authenticated dealer.
- Socket.IO updates from real user actions. No timers invent buyers or dealer activity.
- Non-binding interest with explicit consent and stale-version protection; leaving removes that group's interest.
- Persisted group messages, escaped user content, length limits and role/membership checks.
- Offer CSV export with spreadsheet-formula escaping.
- Three sourced Tata Mumbai showroom listings; Leaflet map, approximate neighbourhood pins and directions links.
- Responsive navigation, semantic landmarks, form labels, visible focus, skip link, reduced-motion support, live feedback, keyboard-accessible Bootstrap dialogs.

## Data and accuracy

All prices, configurations, offer terms and seeded memberships are **illustrative fixtures**, not live inventory, manufacturer quotations or statutory tax advice. Model identities and manufacturer links are real. The Creta asset is a manufacturer thumbnail; other vehicles use original generic vector illustrations, labelled as such.

The showroom directory contains three real listings from Tata's official locator. Pins are approximate neighbourhood coordinates, not verified entrances. Listing a real showroom does not imply partnership. All bidding accounts are fictional or unverified demo accounts and remain separate from these listings.

No payments, real bookings, financial approvals, messages to dealerships, KYC, dealer verification, purchase guarantees or AI service are implemented. Demo reference savings do not automatically increase with group size. For other cities, the directory offers an official locator link instead of fabricated listings.

Internet is needed for initial dependency installation, external map tiles and manufacturer links. Once dependencies are installed, the core app works locally without internet; CSS, JS, car assets and Leaflet are served locally. Map tiles fail gracefully to the accessible listing and directions links.

## Project structure

```text
server.js                 Express routes, sessions, validation, SQLite and live events
data.js                   Model fixtures, city assumptions, sourced showroom metadata
public/
  index.html              Home / how it works
  cars.html               Catalogue, filters, favourites, comparison
  car.html                Car details, price and EMI calculators
  create-group.html       New group form
  groups.html             Group directory and live group dashboard
  bids.html               Dealer offer comparison and interest
  dealers.html            Showroom directory and map
  dealer.html             Dealer workspace
  app.js                  Shared UI, page renderers, API calls and Socket.IO client
  styles.css              Custom design and responsive breakpoints
  assets/                 Local images and original vector illustrations
storage/app.sqlite        Auto-created persistent database (not included in distribution)
test/                     API and browser integration tests
docs/                     Report mapping, sources and test results
```

HTML shells have distinct URLs and titles. `app.js` renders the page content with standard DOM APIs and template strings. This is not a React application. For the viva, explain the render function for your assigned page alongside its HTML shell and shared CSS.

## Testing

```sh
npm test
npx playwright install chromium
npm run test:ui
npm run audit
```

The API suite uses a temporary database. The browser suite starts its own isolated in-memory server on port 3102. The audit command starts its own isolated seeded server on port 3104 and generates a Lighthouse HTML report per page. Set `AUDIT_BASE_URL` to audit an already running server instead. `CHROMIUM_PATH` can specify an existing Chrome/Chromium executable for tests and audits.

See `docs/TEST_RESULTS.md` for results actually obtained in this build. Scores are environment-specific, and an automated audit does not certify complete accessibility compliance.

## Deployment and limits

This delivery is a **local, single-server academic application**, not an already hosted site. The default server binds to localhost. To test on your LAN, set `HOST=0.0.0.0`; other devices use your computer's LAN IP and port 3000. Do this only on a trusted classroom network.

For private hosting use a Node-compatible persistent server with Node 24, a writable persistent volume for `storage/`, HTTPS, `COOKIE_SECURE=true` and WebSocket support. Set `PORT` as required. SQLite is appropriate for this single-process demo; multiple replicas require a shared database and Socket.IO adapter. The project does not provision hosting.

Production work still includes email verification and recovery, verified dealers, removing shared demo credentials, stronger abuse monitoring, backup/restore, privacy and retention policy, real inventory/pricing contracts, payment compliance if added, and deployment hardening. Do not treat this academic server as production-ready.

To reset demo data, stop the server and move the `storage` directory somewhere safe, then restart. This creates a fresh database; do not reset a database containing data you need.
