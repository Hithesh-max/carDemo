# Web Technology report mapping

This guide maps the implemented project to `Miniproject_report_format26.docx`. It is not a fabricated completed team report. Fill in names, registration numbers, faculty and actual student contributions; each student should review, understand and adapt their modules before claiming authorship.

## Team split

| Student | Two assessed pages/modules                       | Main JavaScript entry points           |
| ------- | ------------------------------------------------ | -------------------------------------- |
| 1       | Home and how it works; car catalogue             | `home`, `catalogue`, `carCard`         |
| 2       | Car details and calculators; create buying group | `carDetail`, `createGroup`             |
| 3       | Buying groups and live dashboard; bid comparison | `groupPage`, `groupDetail`, `bidsPage` |
| 4       | Showroom directory/map; dealer workspace         | `dealersPage`, `dealerPage`            |

Shared work: header/footer, login dialog, API client, server, database and design tokens. The eight distinct HTML entry files match the report's two-pages-per-student arrangement. The groups page has directory and detail states; these form one module.

## 1 Project overview

Purpose: make a car-buying negotiation easier to inspect by grouping interested buyers and comparing itemised dealer offers. This academic version implements the software workflow without representing actual dealer participation or purchasing a vehicle.

Target users: prospective buyers, demonstration dealers, mobile users, keyboard-only users and screen-reader users. The app prioritises explicit labels, readable pricing and non-binding actions.

Site map: Home → catalogue → car details → create group → group dashboard → bid comparison. Header links also expose the group directory, showroom directory and dealer workspace. All pages share navigation and account dialogs.

Tools: HTML5; Bootstrap **5.3.8**; custom CSS3; vanilla JavaScript ES modules; JSON REST API; Node.js 24+; Express; Socket.IO; SQLite; Leaflet 1.9.4; Playwright; axe-core; Lighthouse. See `package-lock.json` for exact installed versions.

Design: paper-white backgrounds, forest-green primary actions, pale-green accents, consistent rounded cards, shared header/footer, system sans-serif fonts. The catalogue presents reference prices separately from real-time demo offers. The map labels approximate pins. Forms provide success and error feedback.

## Per-student dynamic input, processing and output

| Module           | Input                                                                            | Processing                                               | Output                                                  |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Home             | Stored group data                                                                | Count memberships and current bids                       | Summary statistics and group cards                      |
| Catalogue        | Search, brand, budget, body style, transmission, sort                            | Filter and sort car JSON; authenticated save API         | Matching cars, saved cars and comparison dialog         |
| Car details      | City, tax assumption, insurance, charges, discount, down payment, interest, term | Calculate total and EMI; validate ranges                 | Updated on-road estimate and monthly EMI                |
| Create group     | Car, city, target, duration, acknowledgement                                     | Server validation and atomic group/membership insertion  | New group URL with creator enrolled                     |
| Group dashboard  | Join/leave and message actions                                                   | Membership/expiry checks; SQLite writes; Socket.IO event | Updated buyer count, offer feed and messages            |
| Bid comparison   | Sort, chosen bid, consent                                                        | Compare totals; reject stale offer versions              | CSV download or persisted non-binding interest          |
| Showrooms        | City and locality search                                                         | Filter sourced records; render Leaflet markers           | Directory, approximate map pins, external directions    |
| Dealer workspace | Group, itemised charges, discount, delivery, terms                               | Validate dealer role, calculate total, upsert own bid    | Versioned offer broadcast and anonymous interest counts |

## Responsive design evidence

All HTML entry files include:

```html
<meta name="viewport" content="width=device-width,initial-scale=1" />
```

`styles.css` uses `.card-grid` with three desktop columns, two columns below 850px, and one below 576px. `.layout-sidebar` becomes one column below 850px. `.form-grid` becomes one column below 576px. Navigation collapses into a labelled toggle below 850px. Images have responsive CSS and fixed intrinsic dimensions. Bid tables use Bootstrap `.table-responsive` with horizontal scrolling inside the table container.

Use the actual CSS rules and page-specific form/card markup as your snippets. Discuss why each rule benefits that page; do not claim every Bootstrap component is used on every page.

## Accessibility evidence

- Every page has a semantic `header`, `nav`, `main`, `footer`, descriptive title, `lang="en-IN"` and one h1.
- A first-focusable skip link targets `main`.
- Form fields have explicit `for`/`id` labels and validation constraints; errors use `role="alert"` where appropriate.
- User-controlled content is escaped before HTML insertion, including names, dealer terms and messages.
- Focus indicators use a 3px outline. Dialog focus trapping and Escape behaviour come from Bootstrap.
- Progress bars have accessible min/max/current values; navigation exposes `aria-current`; menu exposes `aria-expanded`; saved-car controls expose `aria-pressed`.
- Images distinguish manufacturer pictures from generic illustrative silhouettes.
- Messages and status updates are textual; no essential information relies on colour alone.
- Reduced-motion CSS disables transitions when requested.
- Use the measured contrast ratios and actual audit outcomes in `TEST_RESULTS.md`.

Include one actual Lighthouse HTML-report screenshot or WAVE screenshot for **each** assigned page. The audit script creates evidence HTML; the included `audits/screenshots/` contains actual score screenshots for all eight pages. Open the HTML reports for the full findings. Do not substitute a score that was not actually obtained. Manual testing should include keyboard focus, dialogs, narrow-screen forms and reading order.

## Challenges and learning

Write each student's real experience, not invented personal reflections. Useful technical topics to investigate: maintaining UI focus during live updates; calculating totals server-side; distinguishing a simulated price from an actual quotation; preventing duplicate group memberships; preserving offer versions; handling map tile failures; persistent sessions; separating demo bidders from sourced real showrooms.

## Testing summary

Use the actual results in `TEST_RESULTS.md`. Browser tests cover 390px, 768px and 1440px widths. The API test exercises a restart using the same SQLite database. Tests are reproducible with the commands in the README.

## Conclusion and future scope

The project demonstrates an interactive, accessible multi-page website with a working two-sided transaction flow and persistent real-time state. Future work includes verified dealerships, exact variant/inventory feeds, authoritative on-road quotation data, account recovery and production deployment. Payments, actual booking and dealer agreements remain out of scope.

## References

Use `SOURCES.md` and official documentation. Attribute the manufacturer thumbnail. Do not describe generic illustrations as photographs of a specific car. Report versions from `package-lock.json` rather than guessing them.
