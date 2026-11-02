const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const page = document.body.dataset.page,
  main = $("#main"),
  params = new URLSearchParams(location.search);
const money = (n) => "₹" + Math.round(n).toLocaleString("en-IN"),
  lakh = (n) => "₹" + (n / 100000).toFixed(2) + " lakh";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const rates = {
  Mumbai: 0.11,
  Bengaluru: 0.14,
  Delhi: 0.1,
  Pune: 0.11,
  Hyderabad: 0.12,
  Chennai: 0.12,
};
let cars = [],
  cities = [],
  groups = [],
  me = { user: null, favorites: [], memberships: [], interests: [] },
  selectedGroup = null,
  map = null,
  modal = null;
let compare = [];
try {
  compare = JSON.parse(sessionStorage.getItem("compare") || "[]");
  if (!Array.isArray(compare)) compare = [];
} catch {
  compare = [];
}
async function api(url, method = "GET", body) {
  const r = await fetch("/api" + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed.");
  return d;
}
function toast(message, error = false) {
  const n = document.createElement("div");
  n.className = "ac-toast" + (error ? " error" : "");
  n.textContent = message;
  $("#toasts").append(n);
  setTimeout(() => n.remove(), 6500);
}
function busy(fn) {
  return async (e) => {
    e?.preventDefault();
    const b = e?.submitter || e?.currentTarget;
    if (b?.tagName === "BUTTON") b.disabled = true;
    try {
      await fn(e);
    } catch (err) {
      toast(err.message, true);
    } finally {
      if (b?.isConnected && b.tagName === "BUTTON") b.disabled = false;
    }
  };
}
function title(k, h, p, action = "") {
  return `<section class="page-title"><div class="eyebrow">${k}</div><div class="page-topline"><div><h1>${h}</h1><p>${p}</p></div>${action}</div></section>`;
}
function empty(h, p, action = "") {
  return `<div class="empty"><h2>${h}</h2><p>${p}</p>${action}</div>`;
}
function date(t) {
  return new Date(t).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}
function remaining(t) {
  let n = Math.max(0, t - Date.now());
  return n === 0
    ? "Closed"
    : `${Math.floor(n / 86400000)}d ${Math.floor((n % 86400000) / 3600000)}h ${Math.floor((n % 3600000) / 60000)}m`;
}
function picture(c, cls = "") {
  return `<img class="${cls}" src="/assets/${c.image}" alt="${c.id === "creta" ? "Hyundai Creta manufacturer image; configuration may differ" : "Illustrative " + c.type.toLowerCase() + " silhouette, not a photograph of the " + esc(c.name)}" loading="lazy" width="600" height="250">`;
}
function userRequired(role = "buyer") {
  if (!me.user) {
    showAuth();
    return false;
  }
  if (me.user.role !== role) {
    toast(`Switch to a ${role} account for this action.`, true);
    return false;
  }
  return true;
}
function nav() {
  const active = {
    home: "index",
    cars: "cars",
    car: "cars",
    create: "groups",
    groups: "groups",
    bids: "groups",
    dealers: "dealers",
    dealer: "dealer",
  }[page];
  $("#site-header").innerHTML =
    `<div class="wrap header-inner"><a class="brand" href="/index.html"><span class="brandmark" aria-hidden="true">↗</span>AutoCollective<small>INDIA</small></a><nav class="nav-links" id="nav-links" aria-label="Main navigation">${[
      ["index", "Discover"],
      ["cars", "Browse cars"],
      ["groups", "Buying groups"],
      ["dealers", "Showrooms"],
      ["dealer", "For dealers"],
    ]
      .map(
        ([path, label]) =>
          `<a href="/${path}.html" ${active === path ? 'aria-current="page"' : ""}>${label}</a>`,
      )
      .join(
        "",
      )}</nav><div class="header-actions">${me.user ? `<button class="btn btn-white account-chip" id="account" title="Account settings">${esc(me.user.name)}</button>` : '<button class="btn btn-primary" id="sign-in">Sign in <span aria-hidden="true">↗</span></button>'}<button class="btn btn-outline nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-links" id="menu">☰</button></div></div>`;
  $("#menu").onclick = () => {
    const on = $("#nav-links").classList.toggle("open");
    $("#menu").setAttribute("aria-expanded", on);
  };
  $("#sign-in")?.addEventListener("click", () => showAuth());
  $("#account")?.addEventListener("click", showAccount);
}
function openModal(heading, body) {
  if (modal) {
    modal.dispose();
    modal = null;
  }
  $("#modal-root").innerHTML =
    `<div class="modal" id="dialog" tabindex="-1" aria-labelledby="dialog-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content"><div class="modal-header"><h2 class="modal-title" id="dialog-title">${heading}</h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close dialog"></button></div><div class="modal-body">${body}</div></div></div></div>`;
  const previous = document.activeElement;
  modal = new bootstrap.Modal($("#dialog"));
  $("#dialog").addEventListener("hidden.bs.modal", () => previous?.focus(), {
    once: true,
  });
  modal.show();
}
function showAuth(register = false) {
  openModal(
    register ? "Join the collective" : "Welcome back",
    `<div class="auth-tabs"><button class="chip ${register ? "" : "active"}" id="login-tab">Sign in</button><button class="chip ${register ? "active" : ""}" id="register-tab">Create account</button></div><form id="auth-form"><div class="form-grid">${register ? '<div class="full"><label class="form-label" for="name">Your name</label><input id="name" name="name" class="form-control" required minlength="2" maxlength="60" autocomplete="name"></div>' : ""}<div class="full"><label class="form-label" for="email">Email address</label><input id="email" name="email" type="email" class="form-control" required maxlength="120" autocomplete="email"></div><div class="full"><label class="form-label" for="password">Password${register ? " (at least 10 characters)" : ""}</label><input id="password" name="password" type="password" class="form-control" required minlength="${register ? 10 : 1}" maxlength="128" autocomplete="${register ? "new-password" : "current-password"}"></div>${register ? '<div><label class="form-label" for="role">I am a</label><select class="form-select" id="role" name="role"><option value="buyer">Buyer</option><option value="dealer">Demo dealer</option></select></div><div id="company-field" hidden><label class="form-label" for="company">Demo dealership name</label><input id="company" name="company" class="form-control" minlength="2" maxlength="80"></div>' : ""}</div><p class="form-error" id="auth-error" role="alert"></p><button class="btn btn-primary w-100" type="submit">${register ? "Create account" : "Sign in"}</button></form><div class="notice mt-3">For evaluation, use a demo account. Demo accounts are shared; create your own account for a separate workspace.</div><div class="inline-actions mt-3"><button class="btn btn-outline btn-sm" id="demo-buyer">Try as buyer</button><button class="btn btn-outline btn-sm" id="demo-dealer">Try as dealer</button></div>`,
  );
  $("#login-tab").onclick = () => {
    modal.hide();
    setTimeout(() => showAuth(false), 350);
  };
  $("#register-tab").onclick = () => {
    modal.hide();
    setTimeout(() => showAuth(true), 350);
  };
  if (register)
    $("#role").onchange = () => {
      $("#company-field").hidden = $("#role").value !== "dealer";
      $("#company").required = $("#role").value === "dealer";
    };
  async function finish() {
    me = await api("/me");
    modal.hide();
    nav();
    toast(`Welcome, ${me.user.name}.`);
    await refreshData();
    await render();
  }
  $("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    let b = e.submitter;
    b.disabled = true;
    try {
      await api(
        "/auth/" + (register ? "register" : "login"),
        "POST",
        Object.fromEntries(new FormData(e.target)),
      );
      await finish();
    } catch (err) {
      $("#auth-error").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
  for (const role of ["buyer", "dealer"])
    $("#demo-" + role).onclick = busy(async () => {
      await api("/auth/login", "POST", {
        email: role === "buyer" ? "buyer@demo.test" : "dealer1@demo.test",
        password: "Collective2026!",
      });
      await finish();
    });
}
function showAccount() {
  openModal(
    "Your account",
    `<p><strong>${esc(me.user.name)}</strong><br>${esc(me.user.email)} · ${esc(me.user.role)}</p><div class="notice">${me.user.role === "dealer" ? "Dealer accounts in this prototype are unverified demo accounts." : "Your group memberships, saved cars and expressions of interest are stored on the server."}</div><div class="inline-actions mt-4"><a class="btn btn-primary" href="/${me.user.role === "dealer" ? "dealer" : "groups"}.html?mine=1">Open my workspace</a><button class="btn btn-outline" id="logout">Sign out</button></div>`,
  );
  $("#logout").onclick = busy(async () => {
    await api("/auth/logout", "POST", {});
    me = await api("/me");
    modal.hide();
    nav();
    await render();
    toast("Signed out.");
  });
}
function groupCard(g) {
  return `<article class="car-card"><div class="card-visual"><span class="pill ${g.status === "Closed" ? "neutral" : ""}">${esc(g.city)} collective</span>${picture(g.car)}</div><div class="card-body"><div class="overline">${esc(g.car.brand)}</div><h3>${esc(g.car.name)}</h3><div class="subtext">${esc(g.car.fuel)} · ${esc(g.car.transmission)} · Demo configuration</div><div class="price-line"><div><span class="small-note">${g.best ? "Lowest demo offer" : "Illustrative reference"}</span><div class="price">${lakh(g.best || g.baseline)}</div></div>${g.best ? `<span class="saving">${money(Math.max(0, g.baseline - g.best))}<br><small>below reference</small></span>` : ""}</div><div class="member-row"><span><strong>${g.count}/${g.target}</strong> buyers · ${g.seed_count} seeded</span><span data-countdown="${g.expires}">${remaining(g.expires)}</span></div><div class="progress" role="progressbar" aria-label="Group membership" aria-valuenow="${g.count}" aria-valuemin="0" aria-valuemax="${g.target}"><div class="progress-bar" style="width:${Math.min(100, (g.count / g.target) * 100)}%"></div></div><div class="card-bottom"><span class="pill neutral">${g.bid_count} demo offers</span><a href="/groups.html?id=${g.id}" class="btn btn-primary">${me.memberships.includes(g.id) ? "My group" : "Explore group"} <span aria-hidden="true">↗</span><span class="visually-hidden"> ${esc(g.car.name)} in ${esc(g.city)}</span></a></div></div></article>`;
}
async function refreshData() {
  const [g, m] = await Promise.all([api("/groups"), api("/me")]);
  groups = g.groups;
  me = m;
}
// Student 1: landing page and how it works
function home() {
  const open = groups.filter((g) => g.status !== "Closed");
  const low = groups
    .filter((g) => g.best)
    .map((g) => Math.max(0, g.baseline - g.best));
  main.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow">A smarter way to buy your next car</div><h1>Great cars.<br>Better deals.<br><em>Together.</em></h1><p>Bring your buying power together. Join a local group and let dealers compete for your business.</p><div class="inline-actions"><a class="btn btn-mint" href="/groups.html">Find your collective <span aria-hidden="true">↗</span></a><a class="btn btn-outline" style="color:#e4eddf;border-color:#718977" href="#how-it-works">How it works</a></div><div class="hero-trust"><span>No payment to join</span><span>You decide whether to buy</span></div></div><div class="hero-art">${picture(cars[0])}<div class="float-card"><small>Sample price difference</small><strong>${money(Math.max(...low, 0))} <span style="font-size:12px;font-weight:500">per buyer</span></strong><span class="small-note">Demo offer vs illustrative reference</span></div><span class="hero-caption">Hyundai Creta · Manufacturer image. Configuration may differ.</span></div></section><section class="stats" aria-label="Demo platform statistics"><div class="stat"><strong>${open.length}</strong><span>Open buying groups</span></div><div class="stat"><strong>${groups.reduce((n, g) => n + g.count, 0)}</strong><span>Members, including seeded demo buyers</span></div><div class="stat"><strong>${groups.reduce((n, g) => n + g.bid_count, 0)}</strong><span>Demo dealer offers to compare</span></div><div class="stat"><strong>₹0</strong><span>To express your interest</span></div></section><section class="section"><div class="section-head"><div><div class="eyebrow">Find your people. Find your car.</div><h2>Collectives picking up speed</h2><p>Same car. Same city. A stronger conversation.</p></div><a href="/groups.html">View all groups ↗</a></div><div class="card-grid">${open.slice(0, 3).map(groupCard).join("") || empty("Start something together", "Create the first open buying group.")}</div></section><section class="section" id="how-it-works"><div class="section-head"><div class="eyebrow">Simple by design</div></div><h2>From “best price, sir” to a better process.</h2><div class="process-grid"><article class="process-step"><span class="number">01 / FIND</span><h3>Choose your next car</h3><p>Explore models and find buyers in your city who want the same demo configuration.</p></article><article class="process-step"><span class="number">02 / COLLECT</span><h3>Build buying power</h3><p>Join a collective or create one. Every real join updates the group across connected browsers.</p></article><article class="process-step"><span class="number">03 / COMPARE</span><h3>Make your own decision</h3><p>Compare itemised dealer offers. Register non-binding interest only when an offer works for you.</p></article></div></section><div class="callout"><div><h3>A showroom full of opportunity.</h3><p>Try the dealer workspace. Submit an offer and watch it appear live for buyers.</p></div><a class="btn btn-primary" href="/dealer.html">Explore dealer workspace ↗</a></div>`;
}
function carCard(c) {
  const g = groups.filter((g) => g.car_id === c.id && g.status !== "Closed");
  return `<article class="car-card"><div class="card-visual"><span class="pill neutral">${esc(c.type)}</span><button class="icon-btn favorite" data-car="${c.id}" aria-pressed="${me.favorites.includes(c.id)}" aria-label="Save ${esc(c.name)}">♡</button>${picture(c)}</div><div class="card-body"><span class="overline">${esc(c.brand)}</span><h2 class="h4 mb-2">${esc(c.name)}</h2><p class="subtext mb-2">${esc(c.tag)}</p><div class="card-specs"><span>${esc(c.fuel)}</span><span>${esc(c.transmission)}</span><span>Demo configuration</span></div><span class="small-note">Illustrative ex-showroom price</span><div class="price">${lakh(c.price)}</div><div class="card-bottom"><label class="form-check-label"><input type="checkbox" class="form-check-input me-1 compare-check" data-car="${c.id}" ${compare.includes(c.id) ? "checked" : ""}> Compare ${esc(c.name)}</label><a href="/car.html?id=${c.id}" class="btn btn-primary">View car ↗<span class="visually-hidden"> ${esc(c.name)}</span></a></div><div class="subtext mt-3">${g.length} open collective${g.length === 1 ? "" : "s"} · ${c.id === "creta" ? "Manufacturer image" : "Illustrative silhouette"}</div></div></article>`;
}
// Student 1: car search, filters, saved cars and comparison
function catalogue() {
  main.innerHTML =
    title(
      "Explore the garage",
      "Your next car starts here.",
      "Explore real model names with illustrative configurations and prices. Find a collective that fits you.",
    ) +
    `<section class="panel"><form id="filters" class="filters mb-0"><div class="search-field"><label class="form-label" for="search">Search cars</label><input class="form-control" id="search" placeholder="Try Creta, Tata or SUV…" type="search"></div><div><label class="form-label" for="brand">Brand</label><select class="form-select" id="brand"><option value="">All brands</option>${[...new Set(cars.map((c) => c.brand))].map((b) => `<option>${esc(b)}</option>`).join("")}</select></div><div><label class="form-label" for="budget">Ex-showroom budget</label><select class="form-select" id="budget"><option value="0">Any budget</option><option value="1000000">Under ₹10 lakh</option><option value="1200000">Under ₹12 lakh</option><option value="1600000">Under ₹16 lakh</option></select></div><div><label class="form-label" for="transmission">Transmission</label><select class="form-select" id="transmission"><option value="">Any transmission</option><option>Manual</option><option>Automatic</option></select></div></form></section><div class="filter-toolbar"><div class="chips"><button class="chip active" data-type="">All cars</button><button class="chip" data-type="SUV">SUVs</button><button class="chip" data-type="Hatchback">Hatchbacks</button><button class="chip" data-type="saved">Saved cars</button></div><div class="inline-actions align-items-center"><span id="result-count" class="subtext" role="status"></span><label class="visually-hidden" for="sort">Sort cars</label><select id="sort" class="form-select" style="width:auto"><option value="default">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><button class="btn btn-sm btn-outline" id="reset-filters">Reset</button></div></div><div class="card-grid" id="car-results"></div><div id="compare-tray"></div>`;
  let type = "";
  function update() {
    let list = cars.filter(
      (c) =>
        (!type || type === "saved"
          ? type !== "saved" || me.favorites.includes(c.id)
          : c.type === type) &&
        (!$("#brand").value || c.brand === $("#brand").value) &&
        (!$("#transmission").value ||
          c.transmission === $("#transmission").value) &&
        (!+$("#budget").value || c.price <= +$("#budget").value) &&
        `${c.brand} ${c.name} ${c.type}`
          .toLowerCase()
          .includes($("#search").value.toLowerCase()),
    );
    if ($("#sort").value !== "default")
      list.sort(
        (a, b) => ($("#sort").value === "low" ? 1 : -1) * (a.price - b.price),
      );
    $("#result-count").textContent = `${list.length} cars`;
    $("#car-results").innerHTML =
      list.map(carCard).join("") ||
      `<div class="full">${empty("No cars found", "Try a different filter, or save cars with the heart button.")}</div>`;
    $$(".favorite").forEach(
      (b) =>
        (b.onclick = busy(async () => {
          if (!userRequired()) return;
          const r = await api("/favorites/" + b.dataset.car, "POST", {});
          me = await api("/me");
          toast(
            r.saved
              ? "Car saved to your account."
              : "Car removed from saved cars.",
          );
          update();
        })),
    );
    $$(".compare-check").forEach(
      (b) =>
        (b.onchange = () => {
          if (b.checked && compare.length >= 3) {
            b.checked = false;
            toast("Compare up to three cars at a time.", true);
            return;
          }
          compare = b.checked
            ? [...new Set([...compare, b.dataset.car])]
            : compare.filter((x) => x !== b.dataset.car);
          sessionStorage.setItem("compare", JSON.stringify(compare));
          tray();
        }),
    );
  }
  function tray() {
    $("#compare-tray").innerHTML = compare.length
      ? `<div class="comparison-tray"><p>${compare.length}/3 cars selected</p><button class="btn btn-mint btn-sm" id="compare-open" ${compare.length < 2 ? "disabled" : ""}>Compare cars</button><button class="btn btn-sm" style="color:#fff" id="clear-compare">Clear</button></div>`
      : "";
    $("#clear-compare")?.addEventListener("click", () => {
      compare = [];
      sessionStorage.removeItem("compare");
      tray();
      update();
    });
    $("#compare-open")?.addEventListener("click", () => {
      let list = cars.filter((c) => compare.includes(c.id));
      openModal(
        "Your shortlist, side by side",
        `<div class="table-responsive"><table class="table"><caption>Illustrative configurations and prices, not manufacturer quotations.</caption><thead><tr><th scope="col">Compare</th>${list.map((c) => `<th scope="col">${esc(c.brand)} ${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${[
          ["Body style", "type"],
          ["Fuel", "fuel"],
          ["Transmission", "transmission"],
          ["Illustrative ex-showroom", "price"],
        ]
          .map(
            ([l, k]) =>
              `<tr><th scope="row">${l}</th>${list.map((c) => `<td>${k === "price" ? money(c[k]) : esc(c[k])}</td>`).join("")}</tr>`,
          )
          .join(
            "",
          )}<tr><th scope="row">Explore</th>${list.map((c) => `<td><a href="/car.html?id=${c.id}">View ${esc(c.name)}</a></td>`).join("")}</tr></tbody></table></div>`,
      );
    });
  }
  $("#filters").onsubmit = (e) => e.preventDefault();
  $$("input,select", $("#filters")).forEach((el) =>
    el.addEventListener("input", update),
  );
  $("#sort").onchange = update;
  $$("[data-type]").forEach(
    (b) =>
      (b.onclick = () => {
        type = b.dataset.type;
        $$("[data-type]").forEach((x) => {
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-pressed", x === b);
        });
        update();
      }),
  );
  $("#reset-filters").onclick = () => {
    $("#filters").reset();
    $("#sort").value = "default";
    type = "";
    $$("[data-type]").forEach((b) =>
      b.classList.toggle("active", b.dataset.type === ""),
    );
    update();
  };
  update();
  tray();
}
// Student 2: car detail, on-road calculator and EMI
function carDetail() {
  const c = cars.find((c) => c.id === (params.get("id") || "creta"));
  if (!c) {
    main.innerHTML = empty(
      "Car not found",
      "Choose a car from the catalogue.",
      '<a class="btn btn-primary" href="/cars.html">Browse cars</a>',
    );
    return;
  }
  main.innerHTML =
    `<div class="breadcrumb"><a href="/cars.html">Cars</a> &nbsp; / &nbsp; ${esc(c.name)}</div>` +
    title(
      esc(c.brand),
      esc(c.name),
      "Find your collective. Understand every rupee before you decide.",
      `<a class="btn btn-outline" href="${c.source}" target="_blank" rel="noopener">Manufacturer website ↗</a>`,
    ) +
    `<div class="layout-sidebar"><div class="stack"><section class="detail-visual"><span class="watermark" aria-hidden="true">${esc(c.name.toUpperCase())}</span>${picture(c)}</section><p class="small-note">${c.id === "creta" ? "Manufacturer image; shown version may differ." : "Original illustrative silhouette; not an exact model rendering."} Configuration and pricing below are demo assumptions.</p><div class="spec-grid"><div class="spec"><span>Fuel</span><strong>${c.fuel}</strong></div><div class="spec"><span>Transmission</span><strong>${c.transmission}</strong></div><div class="spec"><span>Body style</span><strong>${c.type}</strong></div></div><section class="panel"><h2>Make the numbers work for you</h2><p class="subtext">EMI estimator using a reducing-balance loan. Excludes lender fees. No finance offer is made.</p><div class="form-grid"><div><label class="form-label" for="down">Down payment (₹)</label><input id="down" type="number" class="form-control" min="0" max="20000000" value="300000"></div><div><label class="form-label" for="rate">Annual interest (%)</label><input id="rate" type="number" class="form-control" min="0" max="30" step=".1" value="9"></div><div class="full"><label class="form-label slider-label" for="tenure"><span>Loan tenure</span><output id="tenure-label">5 years</output></label><input id="tenure" type="range" class="form-range" min="1" max="7" value="5"></div></div><div class="line-item total"><span>Estimated monthly EMI</span><output id="emi"></output></div><div id="loan-info" class="subtext mt-2" role="status"></div></section><section><div class="section-head"><h2>Find your ${esc(c.name)} collective</h2></div><div class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">${
      groups
        .filter((g) => g.car_id === c.id)
        .map(groupCard)
        .join("") || empty("Be the first", "Create a group for this car.")
    }</div></section></div><aside class="panel sticky-summary"><div class="eyebrow">No hidden maths</div><h2>On-road estimate</h2><p class="subtext">${esc(c.variant)}</p><label class="form-label" for="calc-city">Registration city</label><select class="form-select mb-3" id="calc-city">${cities.map((x) => `<option>${x}</option>`).join("")}</select><div class="line-item"><span>Illustrative ex-showroom</span><strong>${money(c.price)}</strong></div><div class="form-grid mt-3"><div><label class="form-label" for="tax-rate">Assumed registration (%)</label><input class="form-control" id="tax-rate" type="number" min="0" max="30" step=".1" value="11"></div><div><label class="form-label" for="insurance">Insurance estimate (₹)</label><input class="form-control" id="insurance" type="number" min="0" max="1000000" value="${Math.round(c.price * 0.035)}"></div><div><label class="form-label" for="calc-fees">Other charges (₹)</label><input class="form-control" id="calc-fees" type="number" min="0" max="1000000" value="3000"></div><div><label class="form-label" for="calc-discount">Assumed discount (₹)</label><input class="form-control" id="calc-discount" type="number" min="0" max="${c.price}" value="0"></div></div><div class="line-item mt-3"><span>Registration estimate</span><strong id="tax-amount"></strong></div><div class="line-item total"><span>Estimated total</span><output id="calc-total"></output></div><p class="form-error" id="calc-error" role="alert"></p><div class="notice mt-3">Editable assumptions, not official tax rates or a dealer quote. Discounts are not guaranteed.</div><a class="btn btn-primary w-100 mt-4" id="create-car-group" href="/create-group.html?car=${c.id}">Start a collective ↗</a></aside></div>`;
  let total = 0;
  function calc() {
    const ids = ["tax-rate", "insurance", "calc-fees", "calc-discount"];
    if (
      ids.some((id) => !$("#" + id).checkValidity() || $("#" + id).value === "")
    ) {
      $("#calc-error").textContent =
        "Enter valid non-negative numbers within the displayed limits.";
      $("#calc-total").textContent = "—";
      $("#emi").textContent = "—";
      return;
    }
    $("#calc-error").textContent = "";
    const tax = Math.round((c.price * +$("#tax-rate").value) / 100);
    total =
      c.price +
      tax +
      +$("#insurance").value +
      +$("#calc-fees").value -
      +$("#calc-discount").value;
    $("#tax-amount").textContent = money(tax);
    $("#calc-total").textContent = money(total);
    emi();
  }
  function emi() {
    const down = +$("#down").value,
      r = +$("#rate").value / 1200,
      n = +$("#tenure").value * 12;
    $("#tenure-label").textContent = $("#tenure").value + " years";
    if (
      !$("#down").checkValidity() ||
      !$("#rate").checkValidity() ||
      $("#down").value === "" ||
      $("#rate").value === "" ||
      down > total
    ) {
      $("#emi").textContent = "—";
      $("#loan-info").textContent =
        "Enter valid terms. Down payment cannot exceed the estimate.";
      return;
    }
    const p = Math.max(0, total - down),
      e = r ? (p * r * (1 + r) ** n) / ((1 + r) ** n - 1) : p / n;
    $("#emi").textContent = money(e);
    $("#loan-info").textContent =
      `Loan ${money(p)} · Total interest ${money(e * n - p)} over ${n} months.`;
  }
  ["tax-rate", "insurance", "calc-fees", "calc-discount"].forEach(
    (id) => ($("#" + id).oninput = calc),
  );
  ["down", "rate", "tenure"].forEach((id) => ($("#" + id).oninput = emi));
  $("#calc-city").onchange = () => {
    $("#tax-rate").value = rates[$("#calc-city").value] * 100;
    $("#create-car-group").href =
      `/create-group.html?car=${c.id}&city=${$("#calc-city").value}`;
    calc();
  };
  calc();
}
// Student 2: validated group creation
function createGroup() {
  main.innerHTML =
    title(
      "Start something together",
      "One car. One city. Your collective.",
      "Choose your car and invite people who are planning the same purchase.",
    ) +
    `<div class="layout-sidebar"><section class="panel"><h2>Build your buying group</h2><form id="create-form"><div class="form-grid"><div class="full"><label class="form-label" for="car-choice">Car and demo configuration</label><select id="car-choice" name="carId" class="form-select">${cars.map((c) => `<option value="${c.id}" ${params.get("car") === c.id ? "selected" : ""}>${esc(c.brand)} ${esc(c.name)} · ${c.fuel} ${c.transmission}</option>`).join("")}</select></div><div><label class="form-label" for="city-choice">City</label><select class="form-select" id="city-choice" name="city">${cities.map((c) => `<option ${params.get("city") === c ? "selected" : ""}>${c}</option>`).join("")}</select></div><div><label class="form-label" for="target">Buyer target</label><input id="target" name="target" type="number" class="form-control" min="2" max="50" step="1" value="20" required><div class="form-text">2–50 buyers, including you.</div></div><div class="full"><label class="form-label" for="days">Group window</label><select class="form-select" id="days" name="days"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="30">30 days</option></select></div><div class="full"><label class="form-check-label"><input class="form-check-input me-2" type="checkbox" required>I understand this is an academic prototype. Joining or registering interest does not purchase a car.</label></div></div><button class="btn btn-primary mt-4" type="submit">Create my collective ↗</button><p class="form-error" id="create-error" role="alert"></p></form></section><aside class="stack"><section class="panel" id="group-preview"></section><section class="notice"><strong>You are in control.</strong><br>No payment is taken. You can leave a group. Reaching a target does not guarantee a discount or place an order.</section></aside></div>`;
  function preview() {
    const c = cars.find((c) => c.id === $("#car-choice").value),
      city = $("#city-choice").value;
    $("#group-preview").innerHTML =
      `<div class="eyebrow">Your collective preview</div>${picture(c)}<h2 class="mt-3">${esc(c.name)} · ${city}</h2><p class="subtext">${esc(c.variant)}</p><div class="line-item"><span>First member</span><strong>You</strong></div><div class="line-item"><span>Target</span><strong>${esc($("#target").value)} buyers</strong></div><div class="line-item"><span>Window</span><strong>${$("#days").value} days</strong></div><p class="small-note mt-3 mb-0">New groups start with your real membership only. No seeded buyer counts are added.</p>`;
  }
  $$("select,input[type=number]", $("#create-form")).forEach(
    (e) => (e.oninput = preview),
  );
  $("#create-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!userRequired()) return;
    const b = e.submitter;
    b.disabled = true;
    try {
      const d = Object.fromEntries(new FormData(e.target));
      d.target = +d.target;
      d.days = +d.days;
      const r = await api("/groups", "POST", d);
      location.href = "/groups.html?id=" + r.id;
    } catch (err) {
      $("#create-error").textContent = err.message;
      b.disabled = false;
    }
  };
  preview();
}
// Student 3: group directory
async function groupPage() {
  if (params.get("id")) return groupDetail(Number(params.get("id")));
  main.innerHTML =
    title(
      "Better together",
      "Find your collective.",
      "Join buyers in your city. Compare offers together, then decide for yourself.",
      '<a class="btn btn-primary" href="/create-group.html">+ Create a group</a>',
    ) +
    `<div class="panel"><div class="form-grid"><div><label class="form-label" for="group-city">City</label><select class="form-select" id="group-city"><option value="">All cities</option>${cities.map((c) => `<option>${c}</option>`).join("")}</select></div><div><label class="form-label" for="group-car">Car</label><select class="form-select" id="group-car"><option value="">All cars</option>${cars.map((c) => `<option value="${c.id}">${esc(c.brand)} ${esc(c.name)}</option>`).join("")}</select></div></div></div><div class="filter-toolbar"><div class="chips"><button class="chip active" data-group-filter="all">All groups</button><button class="chip" data-group-filter="open">Open to join</button><button class="chip" data-group-filter="mine">My groups</button></div><span class="subtext" id="group-results-count" role="status"></span></div><div class="card-grid" id="group-results"></div>`;
  let filter = params.get("mine") ? "mine" : "all";
  const update = () => {
    let list = groups.filter(
      (g) =>
        (!$("#group-city").value || g.city === $("#group-city").value) &&
        (!$("#group-car").value || g.car_id === $("#group-car").value) &&
        (filter === "all" ||
          (filter === "open" && g.status === "Forming") ||
          (filter === "mine" && me.memberships.includes(g.id))),
    );
    $$("[data-group-filter]").forEach((b) => {
      b.classList.toggle("active", b.dataset.groupFilter === filter);
      b.setAttribute("aria-pressed", b.dataset.groupFilter === filter);
    });
    $("#group-results-count").textContent = `${list.length} groups`;
    $("#group-results").innerHTML =
      list.map(groupCard).join("") ||
      `<div class="full">${empty("No collectives here yet", filter === "mine" ? "Sign in and join a group to see it here." : "Try another city or start a new collective.", '<a class="btn btn-primary" href="/create-group.html">Create a group</a>')}</div>`;
  };
  $("#group-city").onchange = update;
  $("#group-car").onchange = update;
  $$("[data-group-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.groupFilter;
        update();
      }),
  );
  update();
}
// Student 3: live group dashboard
async function groupDetail(id, preserve = false) {
  let data = await api("/groups/" + id),
    g = data.group;
  selectedGroup = g;
  let draft = preserve ? $("#message-body")?.value || "" : "";
  const joined = me.memberships.includes(g.id),
    interest = me.interests.find((i) => i.group_id === g.id);
  main.innerHTML =
    `<div class="breadcrumb"><a href="/groups.html">Buying groups</a> &nbsp; / &nbsp; Collective #${g.id}</div>` +
    title(
      `${esc(g.city)} collective · #${g.id}`,
      `${esc(g.car.brand)} ${esc(g.car.name)}`,
      `${esc(g.car.fuel)} · ${esc(g.car.transmission)} · Demo configuration`,
      `<div class="inline-actions"><button class="btn btn-outline" id="share-group">Copy group link</button>${joined ? '<button class="btn btn-outline" id="leave-group">Leave group</button>' : `<button class="btn btn-primary" id="join-group" ${g.status !== "Forming" ? "disabled" : ""}>${g.status === "Closed" ? "Group closed" : g.count >= g.target ? "Group full" : "Join this group ↗"}</button>`}</div>`,
    ) +
    `<nav class="tab-links" aria-label="Group views"><a class="active" aria-current="page" href="/groups.html?id=${g.id}">Group overview</a><a href="/bids.html?id=${g.id}">Compare ${data.bids.length} offers</a><a href="/car.html?id=${g.car_id}">Car details</a></nav><div class="layout-sidebar"><div class="stack"><section class="group-hero"><div class="group-heading"><div><span class="pill dark status-badge">${g.status === "Closed" ? "Closed" : joined ? "You’re in this collective" : g.status}</span><div class="group-count" id="member-count">${g.count} <small>/ ${g.target} buyers</small></div></div><div><div class="subtext" style="color:#b9cebf">Group window</div><strong data-countdown="${g.expires}">${remaining(g.expires)}</strong></div></div><div class="progress" role="progressbar" aria-label="Group membership" aria-valuenow="${g.count}" aria-valuemin="0" aria-valuemax="${g.target}"><div class="progress-bar" style="width:${Math.min(100, (g.count / g.target) * 100)}%"></div></div><div class="member-row"><span>${g.seed_count} seeded demo buyers · ${g.count - g.seed_count} account memberships</span><span>${Math.round((g.count / g.target) * 100)}% filled</span></div><div class="metrics"><div class="metric"><span>Demo offers</span><strong>${data.bids.length}</strong></div><div class="metric"><span>Lowest demo total</span><strong>${g.best ? lakh(g.best) : "Awaiting bids"}</strong></div><div class="metric"><span>Closes</span><strong>${date(g.expires)}</strong></div></div></section>${interest ? `<div class="notice"><strong>Interest recorded: ${money(interest.total)}</strong><br>Offer #${interest.bid_id}, version ${interest.bid_version}. ${interest.current_version !== interest.bid_version ? "This offer has changed. Review and reconfirm the new version." : "This is not a reservation or purchase."} <a href="/bids.html?id=${g.id}">Review offers</a></div>` : ""}<section class="panel"><div class="section-head"><h2 class="mb-0">Offers on the table</h2><a href="/bids.html?id=${g.id}">Compare all ↗</a></div>${data.bids.length ? data.bids.map((b, i) => `<article class="bid-row"><div class="dealer-avatar" aria-hidden="true">${esc(b.dealer.slice(0, 1))}</div><div><h3>${esc(b.dealer)}</h3><span class="subtext">${b.delivery}-day delivery estimate ${i === 0 ? "· Lowest total" : ""}</span></div><div class="price">${money(b.total)}<div class="small-note">Demo offer · v${b.version}</div></div></article>`).join("") : '<p class="subtext">No offers yet. Open the dealer workspace to submit the first demo bid.</p>'}</section><section class="panel"><h2>Collective updates</h2><div class="feed" id="feed">${data.messages.length ? data.messages.map((m) => `<article class="message"><header><strong>${esc(m.name)}</strong><span>${new Date(m.created).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span></header><p>${esc(m.body)}</p></article>`).join("") : '<p class="subtext">No messages yet. Ask about availability, inclusions or delivery.</p>'}</div><form id="message-form"><label class="form-label" for="message-body">Post a group update</label><textarea id="message-body" class="form-control" required maxlength="500" rows="2" placeholder="Keep it useful. Please don’t share private contact details." ${g.status === "Closed" ? "disabled" : ""}>${esc(draft)}</textarea><div class="d-flex justify-content-between align-items-center mt-3"><span class="small-note">Group members and demo dealers can post.</span><button class="btn btn-primary btn-sm" ${g.status === "Closed" ? "disabled" : ""}>Post update</button></div></form></section></div><aside class="stack"><section class="panel">${picture(g.car)}<h2 class="mt-3">Your buying brief</h2><div class="line-item"><span>City</span><strong>${esc(g.city)}</strong></div><div class="line-item"><span>Configuration</span><strong>${g.car.transmission}</strong></div><div class="line-item"><span>Illustrative reference</span><strong>${money(g.baseline)}</strong></div><div class="line-item"><span>Commitment to buy</span><strong>None</strong></div><a href="/bids.html?id=${g.id}" class="btn btn-primary w-100 mt-4">Compare dealer offers ↗</a></section><div class="notice">Membership counts update from actual actions. Seeded buyers are labelled. A bigger group does not automatically lower an offer.</div></aside></div>`;
  $("#share-group").onclick = busy(async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("Group link copied.");
    } catch {
      openModal(
        "Share this collective",
        `<label class="form-label" for="share-url">Copy this address</label><input id="share-url" class="form-control" readonly value="${esc(location.href)}">`,
      );
    }
  });
  $("#join-group")?.addEventListener(
    "click",
    busy(async () => {
      if (!userRequired()) return;
      await api(`/groups/${g.id}/join`, "POST", {});
      await refreshData();
      await groupDetail(g.id);
      toast("You joined the collective. No payment or purchase commitment.");
    }),
  );
  $("#leave-group")?.addEventListener("click", () => {
    openModal(
      "Leave this collective?",
      `<p>Your membership and any recorded interest in this group will be removed. You can rejoin if space is available.</p><button class="btn btn-primary" id="confirm-leave">Leave group</button>`,
    );
    $("#confirm-leave").onclick = busy(async () => {
      await api(`/groups/${g.id}/join`, "DELETE", {});
      modal.hide();
      await refreshData();
      await groupDetail(g.id);
      toast("You left the group.");
    });
  });
  $("#message-form").onsubmit = busy(async () => {
    if (!me.user) {
      showAuth();
      return;
    }
    await api(`/groups/${g.id}/messages`, "POST", {
      body: $("#message-body").value,
    });
    $("#message-body").value = "";
    await groupDetail(g.id);
    toast("Update posted.");
  });
}
// Student 3: bid comparison and non-binding interest
async function bidsPage() {
  const id = Number(params.get("id")) || groups[0]?.id;
  if (!id) {
    main.innerHTML = empty(
      "No groups yet",
      "Create a group to compare offers.",
    );
    return;
  }
  const { group: g, bids } = await api("/groups/" + id);
  selectedGroup = g;
  main.innerHTML =
    `<div class="breadcrumb"><a href="/groups.html?id=${id}">Collective #${id}</a> &nbsp; / &nbsp; Compare offers</div>` +
    title(
      "Every rupee, out in the open",
      `${esc(g.car.name)}. Your offers. Your choice.`,
      `${esc(g.city)} · ${g.car.fuel} ${g.car.transmission} · ${g.count}/${g.target} buyers. All offers are academic demo submissions.`,
    ) +
    `<div class="notice mb-4">Compare the final total, mandatory charges and conditions—not just the discount. Reference total ${money(g.baseline)} is illustrative. Prices are in INR.</div><div class="filter-toolbar"><div class="chips"><a class="chip text-decoration-none" href="/groups.html?id=${id}">← Group overview</a><button class="chip" id="export-bids">Download comparison CSV</button></div><div><label class="form-label me-2" for="bid-sort">Sort offers</label><select id="bid-sort" class="form-select d-inline-block" style="width:auto"><option value="total">Lowest total</option><option value="delivery">Soonest delivery</option></select></div></div><div class="card-grid" id="bid-cards"></div><section class="section"><h2>Compare the breakdown</h2><div class="table-responsive mt-3"><table class="table"><caption>Demo offers only. Totals include the listed charges; confirm actual statutory charges and terms with a dealer before purchase.</caption><thead><tr><th scope="col">Demo dealer</th><th scope="col">Ex-showroom</th><th scope="col">Registration</th><th scope="col">Insurance</th><th scope="col">Other charges</th><th scope="col">Discount</th><th scope="col">Final total</th></tr></thead><tbody>${bids.map((b) => `<tr><th scope="row">${esc(b.dealer)}</th>${["ex", "tax", "insurance", "fees", "discount", "total"].map((k) => `<td>${money(b[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  function show() {
    const sorted = [...bids].sort(
        (a, b) => a[$("#bid-sort").value] - b[$("#bid-sort").value],
      ),
      low = Math.min(...bids.map((b) => b.total));
    $("#bid-cards").innerHTML =
      sorted
        .map(
          (b) =>
            `<article class="offer-card ${b.total === low ? "best" : ""}"><span class="pill ${b.total === low ? "" : "neutral"}">${b.total === low ? "LOWEST FINAL TOTAL" : "DEMO DEALER OFFER"}</span><h2>${esc(b.dealer)}</h2><p class="subtext">Unverified demo account · Offer v${b.version}</p><div class="price">${money(b.total)}</div><div class="saving">${b.total <= g.baseline ? money(g.baseline - b.total) + " below" : money(b.total - g.baseline) + " above"} illustrative reference</div><div class="line-item mt-3"><span>Delivery estimate</span><strong>${b.delivery} days</strong></div><div class="line-item"><span>Valid within group window</span><strong>${date(g.expires)}</strong></div><h3 class="h6 mt-4">Inclusions & conditions</h3><p class="subtext break-word" style="min-height:60px">${esc(b.extras)}</p><button class="btn ${b.total === low ? "btn-primary" : "btn-outline"} w-100 interest-btn" data-bid="${b.id}" ${g.status === "Closed" ? "disabled" : ""}>${g.status === "Closed" ? "Group closed" : "Review & express interest"}</button><p class="small-note text-center mt-2 mb-0">No payment. No purchase commitment.</p></article>`,
        )
        .join("") ||
      `<div class="full">${empty("The first offer is still ahead", "Demo dealers can submit a quote in their workspace.", '<a href="/dealer.html" class="btn btn-primary">Open dealer workspace</a>')}</div>`;
    $$(".interest-btn").forEach(
      (el) =>
        (el.onclick = () => {
          if (!userRequired()) return;
          if (!me.memberships.includes(id)) {
            toast("Join this collective before expressing interest.", true);
            return;
          }
          const b = bids.find((x) => x.id === +el.dataset.bid);
          openModal(
            "Review your expression of interest",
            `<p><strong>${esc(g.car.brand)} ${esc(g.car.name)}</strong> · ${esc(g.city)}<br>${esc(b.dealer)} · Offer #${b.id}, version ${b.version}</p><div class="line-item total"><span>Demo final total</span><strong>${money(b.total)}</strong></div><p class="subtext mt-3">${esc(b.extras)} · Delivery estimate: ${b.delivery} days.</p><form id="interest-form"><label class="form-check-label mt-3"><input id="consent" type="checkbox" class="form-check-input me-2" required>I understand that this records non-binding interest in a demo offer. It does not reserve a vehicle or take payment.</label><button class="btn btn-primary w-100 mt-4">Confirm interest</button><p id="interest-error" class="form-error" role="alert"></p></form>`,
          );
          $("#interest-form").onsubmit = async (e) => {
            e.preventDefault();
            e.submitter.disabled = true;
            try {
              await api(`/groups/${id}/interest`, "POST", {
                bidId: b.id,
                version: b.version,
                consent: $("#consent").checked,
              });
              me = await api("/me");
              modal.hide();
              toast(
                "Interest saved. View the confirmation in your group dashboard.",
              );
            } catch (err) {
              $("#interest-error").textContent = err.message;
            } finally {
              e.submitter.disabled = false;
            }
          };
        }),
    );
  }
  $("#bid-sort").onchange = show;
  show();
  $("#export-bids").onclick = () => {
    const cell = (v) =>
      '"' +
      String(v)
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      [
        "Demo dealer",
        "Ex-showroom INR",
        "Registration INR",
        "Insurance INR",
        "Other INR",
        "Discount INR",
        "Total INR",
        "Delivery days",
        "Conditions",
        "Version",
      ],
      ...bids.map((b) => [
        b.dealer,
        b.ex,
        b.tax,
        b.insurance,
        b.fees,
        b.discount,
        b.total,
        b.delivery,
        b.extras,
        b.version,
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `autocollective-group-${id}-demo-offers.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}
// Student 4: sourced directory and interactive map
async function dealersPage() {
  const data = await api("/dealers");
  main.innerHTML =
    title(
      "Make the connection",
      "A real showroom. A clearer next step.",
      "Explore sourced showroom listings. These businesses are not platform partners and have not submitted the demo offers.",
    ) +
    `<div class="panel mb-4"><div class="form-grid"><div><label class="form-label" for="dealer-city">City</label><select class="form-select" id="dealer-city">${cities.map((c) => `<option>${c}</option>`).join("")}</select></div><div><label class="form-label" for="dealer-search">Search showroom or locality</label><input class="form-control" type="search" id="dealer-search" placeholder="Try Bandra or Puneet…"></div></div></div><div class="map-layout"><section id="dealer-results" aria-label="Showroom listings"></section><aside class="map-panel"><div id="map" class="map" role="region" aria-label="Map of approximate showroom neighbourhoods"></div><p class="small-note mt-2" id="map-note">${esc(data.locationNote)}</p><div class="notice">Listings checked ${data.checked}. Mumbai Tata listings are included in this version. Other cities link to manufacturer discovery rather than fabricated listings.</div></aside></div>`;
  if (map) map.remove();
  map = L.map("map", { scrollWheelZoom: false }).setView([19.07, 72.84], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
  })
    .on("tileerror", () => {
      $("#map-note").textContent =
        "Map tiles are unavailable. The showroom list and directions links still work. Pins are approximate.";
    })
    .addTo(map);
  let markers = L.layerGroup().addTo(map);
  const update = () => {
    const list = data.dealers.filter(
      (d) =>
        d.city === $("#dealer-city").value &&
        `${d.name} ${d.area}`
          .toLowerCase()
          .includes($("#dealer-search").value.toLowerCase()),
    );
    $("#dealer-results").innerHTML =
      list
        .map(
          (d) =>
            `<article class="dealer-card"><span class="pill neutral">${esc(d.brand)} · Sourced listing</span><h2>${esc(d.name)}</h2><p>${esc(d.address)}</p><p class="small-note">Not affiliated · Neighbourhood pin only</p><div class="inline-actions"><button class="btn btn-outline btn-sm locate" data-id="${d.id}">Show on map</button><a class="btn btn-primary btn-sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.name + " " + d.address)}" target="_blank" rel="noopener">Directions ↗</a><a class="btn btn-white btn-sm" href="${d.source}" target="_blank" rel="noopener">Official source ↗</a></div></article>`,
        )
        .join("") ||
      empty(
        "No sourced listings here yet",
        "Use the manufacturer’s official locator to find a showroom.",
        '<a href="https://dealer-locator.cars.tatamotors.com/" class="btn btn-primary" target="_blank" rel="noopener">Tata dealer locator ↗</a>',
      );
    markers.clearLayers();
    for (const d of list) {
      const node = document.createElement("div");
      node.textContent = d.name + " · Approximate neighbourhood";
      L.marker([d.lat, d.lon], {
        title: d.name,
        alt: d.name + " approximate location",
      })
        .bindPopup(node)
        .addTo(markers);
    }
    $$(".locate").forEach(
      (b) =>
        (b.onclick = () => {
          const d = list.find((x) => x.id === +b.dataset.id);
          map.setView([d.lat, d.lon], 15);
          markers.eachLayer((m) => {
            if (m.getLatLng().lat === d.lat) m.openPopup();
          });
          $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
        }),
    );
    if (list.length)
      map.fitBounds(
        list.map((d) => [d.lat, d.lon]),
        { padding: [35, 35], maxZoom: 13 },
      );
  };
  $("#dealer-city").onchange = update;
  $("#dealer-search").oninput = update;
  update();
}
// Student 4: dealer offer submission and interest dashboard
async function dealerPage() {
  if (!me.user || me.user.role !== "dealer") {
    main.innerHTML =
      title(
        "The dealer workspace",
        "Meet buyers who mean business.",
        "See buying groups, submit an itemised demo offer and update it in real time.",
      ) +
      `<div class="layout-sidebar"><section class="panel"><div class="eyebrow">A working two-sided demo</div><h2>Turn a group into a conversation.</h2><ul class="check-list"><li>Discover demand by car and city</li><li>Submit an itemised final price</li><li>Revise your own offers as negotiations change</li><li>See anonymous counts of interested buyers</li></ul><button class="btn btn-primary" id="dealer-login">Sign in as a demo dealer ↗</button><p class="small-note mt-3">Use another browser or an incognito window for the dealer, while keeping your buyer account open.</p></section><aside class="group-hero"><div class="eyebrow" style="color:#d2efba">Live opportunity</div><div class="group-count">${groups.filter((g) => g.status !== "Closed").length}</div><p class="mt-3">Open collectives ready for demo offers.</p><div class="notice">Registration does not verify a dealership. All offers remain labelled as demo submissions.</div></aside></div>`;
    $("#dealer-login").onclick = () => showAuth();
    return;
  }
  const leads = await api("/dealer/interests");
  main.innerHTML =
    title(
      "Dealer workspace · Unverified demo account",
      `Welcome, ${esc(me.user.company)}.`,
      `Submit a clear offer. Buyers see the final total and every condition.`,
    ) +
    `<div class="layout-sidebar"><section class="panel"><h2>Submit or revise an offer</h2><form id="bid-form"><label class="form-label" for="dealer-group">Buying group</label><select class="form-select mb-4" id="dealer-group" name="groupId">${groups.map((g) => `<option value="${g.id}" ${g.status === "Closed" ? "disabled" : ""}>#${g.id} · ${esc(g.car.name)} · ${g.city} · ${g.count}/${g.target} buyers${g.status === "Closed" ? " · Closed" : ""}</option>`).join("")}</select><div id="existing-bid" class="notice mb-4"></div><div class="form-grid">${[
      ["ex", "Ex-showroom price (₹)", 100000, 10000000],
      ["tax", "Registration / tax (₹)", 0, 3000000],
      ["insurance", "Insurance (₹)", 0, 1000000],
      ["fees", "Other mandatory charges (₹)", 0, 1000000],
      ["discount", "Cash discount (₹)", 0, 10000000],
      ["delivery", "Delivery estimate (days)", 1, 365],
    ]
      .map(
        ([k, l, min, max]) =>
          `<div><label class="form-label" for="bid-${k}">${l}</label><input class="form-control" id="bid-${k}" name="${k}" type="number" min="${min}" max="${max}" step="1" required></div>`,
      )
      .join(
        "",
      )}<div class="full"><label class="form-label" for="bid-extras">Inclusions, exclusions and conditions</label><textarea class="form-control" id="bid-extras" name="extras" required minlength="3" maxlength="400" rows="3" placeholder="Describe warranty, accessories, availability and any conditions."></textarea></div></div><div class="line-item total"><span>Final demo price</span><output id="bid-total">—</output></div><label class="form-check-label mt-3"><input class="form-check-input me-2" id="bid-confirm" type="checkbox" required>I have included all mandatory charges in this demo offer. I understand that the submission is visible to buyers.</label><p class="form-error" id="bid-error" role="alert"></p><button class="btn btn-primary mt-3" type="submit">Publish demo offer ↗</button></form></section><aside class="stack"><section class="panel" id="dealer-summary"></section><section class="panel" id="dealer-leads"><h2>Expressions of interest</h2>${leads.interests.length ? leads.interests.map((l) => `<div class="line-item"><span>Group #${l.group_id} · v${l.bid_version}${l.current_version !== l.bid_version ? " (prior terms)" : ""}</span><strong>${l.buyers} buyer${l.buyers === 1 ? "" : "s"}</strong></div>`).join("") : '<p class="subtext">No interest recorded for your offers yet. Buyer contact details are not shared.</p>'}</section><div class="notice">Revising an offer creates a new version. Buyers who chose earlier terms must review and reconfirm; their previous interest is not silently transferred.</div></aside></div>`;
  let loadSequence = 0;
  async function load() {
    const seq = ++loadSequence,
      id = +$("#dealer-group").value;
    if (!id) return;
    const data = await api("/groups/" + id);
    if (seq !== loadSequence) return;
    const g = data.group,
      c = g.car,
      own = data.bids.find((b) => b.dealer_id === me.user.id);
    const defaults = {
      ex: c.price,
      tax: Math.round(c.price * rates[g.city]),
      insurance: Math.round(c.price * 0.035),
      fees: 3000,
      discount: 0,
      delivery: 14,
      extras: "",
    };
    for (const k of Object.keys(defaults))
      $("#bid-" + k).value = own ? own[k] : defaults[k];
    $("#existing-bid").textContent = own
      ? `Editing your current offer, version ${own.version}. Publishing saves a new version.`
      : "Your first offer for this group. The suggested charges are illustrative assumptions.";
    $("#bid-confirm").checked = false;
    $("#dealer-summary").innerHTML =
      `<div class="eyebrow">The buying brief</div>${picture(c)}<h2 class="mt-3">${esc(c.name)} · ${g.city}</h2><div class="line-item"><span>Buyers</span><strong>${g.count}/${g.target}</strong></div><div class="line-item"><span>Configuration</span><strong>${c.fuel} ${c.transmission}</strong></div><div class="line-item"><span>Current lowest demo offer</span><strong>${g.best ? money(g.best) : "No offers"}</strong></div><div class="line-item"><span>Closes</span><strong>${date(g.expires)}</strong></div><a class="btn btn-outline w-100 mt-4" href="/groups.html?id=${id}">View buyer dashboard ↗</a>`;
    calc();
  }
  function calc() {
    const vals = ["ex", "tax", "insurance", "fees", "discount"].map(
        (k) => +$("#bid-" + k).value,
      ),
      total = vals[0] + vals[1] + vals[2] + vals[3] - vals[4];
    $("#bid-total").textContent = money(total);
    $("#bid-discount").max = $("#bid-ex").value;
  }
  $("#dealer-group").onchange = busy(load);
  $$("input[type=number]", $("#bid-form")).forEach((i) => (i.oninput = calc));
  $("#bid-form").onsubmit = async (e) => {
    e.preventDefault();
    e.submitter.disabled = true;
    try {
      const d = Object.fromEntries(new FormData(e.target));
      for (const k of [
        "ex",
        "tax",
        "insurance",
        "fees",
        "discount",
        "delivery",
      ])
        d[k] = +d[k];
      await api(`/groups/${d.groupId}/bids`, "POST", d);
      toast("Offer published. Connected buyers receive the update live.");
      $("#bid-error").textContent = "";
      await refreshData();
      await load();
    } catch (err) {
      $("#bid-error").textContent = err.message;
    } finally {
      e.submitter.disabled = false;
    }
  };
  await load();
}
async function render() {
  try {
    if (page !== "dealers" && map) {
      map.remove();
      map = null;
    }
    await (
      {
        home,
        cars: catalogue,
        car: carDetail,
        create: createGroup,
        groups: groupPage,
        bids: bidsPage,
        dealers: dealersPage,
        dealer: dealerPage,
      }[page] || home
    )();
  } catch (err) {
    main.innerHTML = empty(
      "We couldn’t load this page",
      esc(err.message),
      '<button class="btn btn-primary" id="retry-page">Try again</button>',
    );
    $("#retry-page").onclick = () => render();
  }
}
async function init() {
  try {
    const d = await api("/cars");
    cars = d.cars;
    cities = d.cities;
    await refreshData();
    nav();
    await render();
  } catch (err) {
    nav();
    main.innerHTML = empty(
      "The server is not reachable",
      "Start the application with npm start, then open http://localhost:3000.",
      '<button class="btn btn-primary" id="retry-init">Retry connection</button>',
    );
    $("#retry-init").onclick = init;
  }
}
await init();
const socket = io();
let refreshTimer;
socket.on("connect", async () => {
  $("#connection").textContent = "Live connection";
  $("#connection").classList.remove("offline");
  $("#connection-warning").hidden = true;
  try {
    await refreshData();
    if (page === "groups" && params.get("id"))
      await groupDetail(+params.get("id"), true);
  } catch {}
});
socket.on("disconnect", () => {
  $("#connection").textContent = "Reconnecting";
  $("#connection").classList.add("offline");
  $("#connection-warning").hidden = false;
});
socket.on("update", (event) => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      await refreshData();
      if (
        page === "groups" &&
        params.get("id") &&
        +params.get("id") === event.groupId
      ) {
        const focused = document.activeElement?.id,
          selection = document.activeElement?.selectionStart;
        await groupDetail(event.groupId, true);
        if (focused && $("#" + focused)) {
          const el = $("#" + focused);
          el.focus({ preventScroll: true });
          if (typeof selection === "number")
            el.setSelectionRange(selection, selection);
        }
      } else if (
        page === "dealer" &&
        me.user?.role === "dealer" &&
        $("#dealer-leads")
      ) {
        const leads = await api("/dealer/interests");
        $("#dealer-leads").innerHTML =
          "<h2>Expressions of interest</h2>" +
          (leads.interests.length
            ? leads.interests
                .map(
                  (l) =>
                    `<div class="line-item"><span>Group #${l.group_id} · v${l.bid_version}${l.current_version !== l.bid_version ? " (prior terms)" : ""}</span><strong>${l.buyers} buyers</strong></div>`,
                )
                .join("")
            : '<p class="subtext">No interest recorded for your offers yet.</p>');
      } else if (page === "home") home();
      else if (
        page === "bids" &&
        selectedGroup?.id === event.groupId &&
        event.kind === "bid"
      ) {
        toast("A dealer offer changed. Review the updated comparison.");
        await bidsPage();
      } else if (page === "groups" && !params.get("id")) {
        const city = $("#group-city")?.value,
          car = $("#group-car")?.value,
          filter = $("[data-group-filter].active")?.dataset.groupFilter;
        await groupPage();
        $("#group-city").value = city;
        $("#group-car").value = car;
        $(`[data-group-filter="${filter || "all"}"]`).click();
      }
    } catch (err) {
      toast("Live refresh failed. Please reload to get the latest data.", true);
    }
  }, 150);
});
setInterval(() => {
  $$("[data-countdown]").forEach((n) => {
    n.textContent = remaining(+n.dataset.countdown);
  });
}, 30000);
