import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { cars, cities, estimate, showrooms } from "./data.js";
const ROOT = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(ROOT, "storage"), { recursive: true });
const db = new DatabaseSync(
  process.env.DB_PATH || path.join(ROOT, "storage/app.sqlite"),
);
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,company TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY,car_id TEXT,city TEXT,target INTEGER,seed_count INTEGER DEFAULT 0,expires INTEGER,created_by INTEGER REFERENCES users(id),created INTEGER);
CREATE TABLE IF NOT EXISTS members(group_id INTEGER REFERENCES groups(id),user_id INTEGER REFERENCES users(id),created INTEGER,PRIMARY KEY(group_id,user_id));
CREATE TABLE IF NOT EXISTS bids(id INTEGER PRIMARY KEY,group_id INTEGER REFERENCES groups(id),dealer_id INTEGER REFERENCES users(id),ex INTEGER,tax INTEGER,insurance INTEGER,fees INTEGER,discount INTEGER,total INTEGER,delivery INTEGER,extras TEXT,version INTEGER DEFAULT 1,updated INTEGER,UNIQUE(group_id,dealer_id));
CREATE TABLE IF NOT EXISTS interests(user_id INTEGER REFERENCES users(id),group_id INTEGER REFERENCES groups(id),bid_id INTEGER REFERENCES bids(id),bid_version INTEGER,total INTEGER,created INTEGER,PRIMARY KEY(user_id,group_id));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,group_id INTEGER REFERENCES groups(id),user_id INTEGER REFERENCES users(id),body TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER REFERENCES users(id),car_id TEXT,PRIMARY KEY(user_id,car_id));`);
const hash = (p) => {
  const s = randomBytes(16).toString("hex");
  return `${s}:${scryptSync(p, s, 64).toString("hex")}`;
};
const check = (p, h) => {
  const [s, k] = h.split(":");
  return timingSafeEqual(Buffer.from(k, "hex"), scryptSync(p, s, 64));
};
const one = (q, ...p) => db.prepare(q).get(...p),
  all = (q, ...p) => db.prepare(q).all(...p),
  run = (q, ...p) => db.prepare(q).run(...p);
if (!one("SELECT id FROM users LIMIT 1")) {
  const insert = db.prepare(
    "INSERT INTO users(name,email,password,role,company) VALUES(?,?,?,?,?)",
  );
  insert.run(
    "Demo Buyer",
    "buyer@demo.test",
    hash("Collective2026!"),
    "buyer",
    "",
  );
  ["Harbour Auto", "Metro Motors", "Coastline Cars"].forEach((n, i) =>
    insert.run(
      n,
      `dealer${i + 1}@demo.test`,
      hash("Collective2026!"),
      "dealer",
      `${n} (demo)`,
    ),
  );
  const now = Date.now();
  [
    ["creta", "Mumbai", 20, 17],
    ["nexon", "Mumbai", 15, 11],
    ["swift", "Pune", 12, 8],
    ["brezza", "Delhi", 20, 14],
    ["xuv3xo", "Bengaluru", 15, 9],
    ["i20", "Hyderabad", 10, 6],
  ].forEach(([c, city, t, n], i) =>
    run(
      "INSERT INTO groups(car_id,city,target,seed_count,expires,created) VALUES(?,?,?,?,?,?)",
      c,
      city,
      t,
      n,
      now + (4 + i) * 86400000,
      now,
    ),
  );
  for (let g = 1; g <= 6; g++) {
    const group = one("SELECT * FROM groups WHERE id=?", g),
      base = estimate(
        cars.find((c) => c.id === group.car_id),
        group.city,
      );
    for (let i = 0; i < 3; i++) {
      let discount = 45000 + i * 12000;
      run(
        "INSERT INTO bids(group_id,dealer_id,ex,tax,insurance,fees,discount,total,delivery,extras,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        g,
        i + 2,
        base.ex,
        base.tax,
        base.insurance,
        base.fees,
        discount,
        base.total - discount,
        14 + i * 7,
        [
          "Standard warranty; no accessory bundle",
          "Floor mats included; standard warranty",
          "Basic accessory kit; standard warranty",
        ][i],
        now - i * 3600000,
      );
    }
  }
}
const app = express(),
  server = createServer(app),
  io = new Server(server, { maxHttpBufferSize: 16384 });
app.disable("x-powered-by"); app.set("trust proxy", "loopback");
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self' ws: wss:; frame-src https://www.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'",
  );
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== `${req.protocol}://${req.get("host")}`
  )
    return res
      .status(403)
      .json({ error: "Cross-origin requests are not allowed." });
  const raw = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("ac_session="))
    ?.slice(11);
  req.session = raw ? createHash("sha256").update(raw).digest("hex") : null;
  req.user = req.session
    ? one(
        "SELECT u.id,u.name,u.email,u.role,u.company FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        req.session,
        Date.now(),
      )
    : null;
  next();
});
const fail = (status, message) => {
  let e = new Error(message);
  e.status = status;
  throw e;
};
function auth(role) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Sign in to continue." });
    if (role && req.user.role !== role)
      return res
        .status(403)
        .json({ error: `This action requires a ${role} account.` });
    next();
  };
}
const string = (v, label, min = 1, max = 100) => {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max)
    fail(400, `${label} must be ${min}â€“${max} characters.`);
  return v.trim();
};
const integer = (v, label, min, max) => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min || v > max)
    fail(400, `${label} must be a whole number from ${min} to ${max}.`);
  return v;
};
function group(id) {
  const g = one("SELECT * FROM groups WHERE id=?", Number(id));
  if (!g) fail(404, "Buying group not found.");
  return g;
}
function active(g) {
  if (g.expires <= Date.now())
    fail(409, "This group has closed. Create or join another group.");
}
function expanded(g) {
  const car = cars.find((c) => c.id === g.car_id),
    members =
      g.seed_count +
      one("SELECT COUNT(*) n FROM members WHERE group_id=?", g.id).n,
    b = one(
      "SELECT MIN(total) best, COUNT(*) count FROM bids WHERE group_id=?",
      g.id,
    );
  return {
    ...g,
    car,
    count: members,
    best: b.best,
    bid_count: b.count,
    baseline: estimate(car, g.city).total,
    status:
      g.expires <= Date.now()
        ? "Closed"
        : members >= g.target
          ? "Target reached"
          : "Forming",
  };
}
const emit = (id, kind) =>
  io.emit("update", { groupId: Number(id), kind, at: Date.now() });
const limiter = new Map();
app.use("/api", (req, res, next) => {
  if (req.method === "GET") return next();
  const key = `${req.ip}:${req.path.startsWith("/auth") ? "auth" : "write"}`,
    now = Date.now();
  let rec = limiter.get(key);
  if (!rec || now - rec.start > 60000) {
    rec = { start: now, n: 0 };
    limiter.set(key, rec);
  }
  if (++rec.n > (key.endsWith("auth") ? 25 : 100))
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again in a minute." });
  next();
});
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, v] of limiter)
    if (now - v.start > 60000) limiter.delete(key);
  run("DELETE FROM sessions WHERE expires<?", now);
}, 60000);
cleanup.unref();
function session(res, user) {
  const token = randomBytes(32).toString("hex");
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    createHash("sha256").update(token).digest("hex"),
    user.id,
    Date.now() + 7 * 86400000,
  );
  res.cookie("ac_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 7 * 86400000,
    path: "/",
  });
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    company: user.company,
  };
}
app.post("/api/auth/register", (req, res) => {
  let { name, email, password, role, company } = req.body;
  name = string(name, "Name", 2, 60);
  email = string(email, "Email", 5, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, "Enter a valid email address.");
  password = string(password, "Password", 10, 128);
  if (!["buyer", "dealer"].includes(role)) fail(400, "Select buyer or dealer.");
  company =
    role === "dealer" ? string(company, "Demo dealership name", 2, 80) : "";
  if (one("SELECT id FROM users WHERE email=?", email))
    fail(409, "An account with this email already exists.");
  const id = run(
    "INSERT INTO users(name,email,password,role,company) VALUES(?,?,?,?,?)",
    name,
    email,
    hash(password),
    role,
    company,
  ).lastInsertRowid;
  res
    .status(201)
    .json({ user: session(res, one("SELECT * FROM users WHERE id=?", id)) });
});
app.post("/api/auth/login", (req, res) => {
  const email = string(req.body.email, "Email", 3, 120).toLowerCase(),
    password = string(req.body.password, "Password", 1, 128),
    u = one("SELECT * FROM users WHERE email=?", email);
  if (!u || !check(password, u.password))
    fail(401, "Email or password is incorrect.");
  if (req.session) run("DELETE FROM sessions WHERE token=?", req.session);
  res.json({ user: session(res, u) });
});
app.post("/api/auth/logout", (req, res) => {
  if (req.session) run("DELETE FROM sessions WHERE token=?", req.session);
  res.clearCookie("ac_session", { path: "/" }).json({ ok: true });
});
app.get("/api/me", (req, res) =>
  res.json({
    user: req.user || null,
    favorites: req.user
      ? all("SELECT car_id FROM favorites WHERE user_id=?", req.user.id).map(
          (x) => x.car_id,
        )
      : [],
    memberships: req.user
      ? all("SELECT group_id FROM members WHERE user_id=?", req.user.id).map(
          (x) => x.group_id,
        )
      : [],
    interests: req.user
      ? all(
          "SELECT i.*, b.version current_version FROM interests i JOIN bids b ON b.id=i.bid_id WHERE user_id=?",
          req.user.id,
        )
      : [],
  }),
);
app.get("/api/cars", (req, res) => res.json({ cars, cities }));
app.get("/api/dealers", (req, res) =>
  res.json({
    dealers: showrooms,
    checked: "2026-11-02",
    locationNote:
      "Pins show approximate neighbourhood locations. Use the official listing or directions to locate the entrance. Listings do not imply partnership.",
  }),
);
app.get("/api/groups", (req, res) =>
  res.json({ groups: all("SELECT * FROM groups ORDER BY id").map(expanded) }),
);
app.get("/api/groups/:id", (req, res) => {
  const g = expanded(group(req.params.id));
  res.json({
    group: g,
    bids: all(
      "SELECT b.*, u.company dealer FROM bids b JOIN users u ON u.id=b.dealer_id WHERE b.group_id=? ORDER BY b.total,b.delivery",
      g.id,
    ),
    messages: all(
      "SELECT m.id,m.body,m.created,u.name FROM messages m JOIN users u ON u.id=m.user_id WHERE group_id=? ORDER BY m.id DESC LIMIT 50",
      g.id,
    ).reverse(),
  });
});
app.post("/api/groups", auth("buyer"), (req, res) => {
  const { carId, city } = req.body;
  if (!cars.some((c) => c.id === carId) || !cities.includes(city))
    fail(400, "Select a valid car and city.");
  const target = integer(req.body.target, "Target", 2, 50),
    days = integer(req.body.days, "Duration", 1, 30),
    now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    const id = Number(
      run(
        "INSERT INTO groups(car_id,city,target,expires,created_by,created) VALUES(?,?,?,?,?,?)",
        carId,
        city,
        target,
        now + days * 86400000,
        req.user.id,
        now,
      ).lastInsertRowid,
    );
    run("INSERT INTO members VALUES(?,?,?)", id, req.user.id, now);
    db.exec("COMMIT");
    emit(id, "group");
    res.status(201).json({ id });
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
});
app.post("/api/groups/:id/join", auth("buyer"), (req, res) => {
  const g = group(req.params.id);
  active(g);
  if (
    one(
      "SELECT 1 FROM members WHERE group_id=? AND user_id=?",
      g.id,
      req.user.id,
    )
  )
    fail(409, "You already belong to this group.");
  if (expanded(g).count >= g.target)
    fail(409, "This group is full. You can create another group.");
  run("INSERT INTO members VALUES(?,?,?)", g.id, req.user.id, Date.now());
  emit(g.id, "membership");
  res.json({ ok: true });
});
app.delete("/api/groups/:id/join", auth("buyer"), (req, res) => {
  const g = group(req.params.id);
  db.exec("BEGIN IMMEDIATE");
  try {
    run(
      "DELETE FROM interests WHERE group_id=? AND user_id=?",
      g.id,
      req.user.id,
    );
    run(
      "DELETE FROM members WHERE group_id=? AND user_id=?",
      g.id,
      req.user.id,
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  emit(g.id, "membership");
  res.json({ ok: true });
});
app.post("/api/groups/:id/bids", auth("dealer"), (req, res) => {
  const g = group(req.params.id);
  active(g);
  const b = req.body;
  const ex = integer(b.ex, "Ex-showroom", 100000, 10000000),
    tax = integer(b.tax, "Registration / tax", 0, 3000000),
    insurance = integer(b.insurance, "Insurance", 0, 1000000),
    fees = integer(b.fees, "Other mandatory charges", 0, 1000000),
    discount = integer(b.discount, "Discount", 0, ex),
    delivery = integer(b.delivery, "Delivery days", 1, 365),
    extras = string(b.extras, "Inclusions / conditions", 3, 400);
  const total = ex + tax + insurance + fees - discount;
  if (total <= 0) fail(400, "The final price must be positive.");
  run(
    `INSERT INTO bids(group_id,dealer_id,ex,tax,insurance,fees,discount,total,delivery,extras,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(group_id,dealer_id) DO UPDATE SET ex=excluded.ex,tax=excluded.tax,insurance=excluded.insurance,fees=excluded.fees,discount=excluded.discount,total=excluded.total,delivery=excluded.delivery,extras=excluded.extras,version=bids.version+1,updated=excluded.updated`,
    g.id,
    req.user.id,
    ex,
    tax,
    insurance,
    fees,
    discount,
    total,
    delivery,
    extras,
    Date.now(),
  );
  emit(g.id, "bid");
  res.json({ ok: true });
});
app.post("/api/groups/:id/interest", auth("buyer"), (req, res) => {
  const g = group(req.params.id);
  active(g);
  if (
    !one(
      "SELECT 1 FROM members WHERE group_id=? AND user_id=?",
      g.id,
      req.user.id,
    )
  )
    fail(403, "Join this group before registering interest.");
  if (req.body.consent !== true)
    fail(400, "Confirm that this is non-binding interest.");
  const b = one(
    "SELECT * FROM bids WHERE id=? AND group_id=?",
    Number(req.body.bidId),
    g.id,
  );
  if (!b) fail(404, "Offer not found.");
  if (b.version !== req.body.version)
    fail(409, "This offer changed. Review the latest price and try again.");
  run(
    "INSERT INTO interests VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,group_id) DO UPDATE SET bid_id=excluded.bid_id,bid_version=excluded.bid_version,total=excluded.total,created=excluded.created",
    req.user.id,
    g.id,
    b.id,
    b.version,
    b.total,
    Date.now(),
  );
  emit(g.id, "interest");
  res.json({ ok: true, total: b.total });
});
app.post("/api/groups/:id/messages", auth(), (req, res) => {
  const g = group(req.params.id);
  active(g);
  if (
    req.user.role === "buyer" &&
    !one(
      "SELECT 1 FROM members WHERE group_id=? AND user_id=?",
      g.id,
      req.user.id,
    )
  )
    fail(403, "Join the group to post an update.");
  const body = string(req.body.body, "Message", 1, 500);
  run(
    "INSERT INTO messages(group_id,user_id,body,created) VALUES(?,?,?,?)",
    g.id,
    req.user.id,
    body,
    Date.now(),
  );
  emit(g.id, "message");
  res.status(201).json({ ok: true });
});
app.post("/api/favorites/:carId", auth("buyer"), (req, res) => {
  if (!cars.some((c) => c.id === req.params.carId)) fail(404, "Car not found.");
  const exists = one(
    "SELECT 1 FROM favorites WHERE user_id=? AND car_id=?",
    req.user.id,
    req.params.carId,
  );
  if (exists)
    run(
      "DELETE FROM favorites WHERE user_id=? AND car_id=?",
      req.user.id,
      req.params.carId,
    );
  else run("INSERT INTO favorites VALUES(?,?)", req.user.id, req.params.carId);
  res.json({ saved: !exists });
});
app.get("/api/dealer/interests", auth("dealer"), (req, res) =>
  res.json({
    interests: all(
      "SELECT i.group_id,i.bid_id,i.bid_version,i.total,i.created,b.version current_version,COUNT(*) buyers FROM interests i JOIN bids b ON b.id=i.bid_id WHERE b.dealer_id=? GROUP BY i.group_id,i.bid_id,i.bid_version,i.total",
      req.user.id,
    ),
  }),
);
app.use(
  "/vendor/bootstrap",
  express.static(path.join(ROOT, "node_modules/bootstrap/dist")),
);
app.use(
  "/vendor/leaflet",
  express.static(path.join(ROOT, "node_modules/leaflet/dist")),
);
app.use(express.static(path.join(ROOT, "public")));
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
app.use((req, res) =>
  res.status(404).send("Page not found. Return to /index.html"),
);
app.use((e, req, res, next) => {
  if (!e.status) console.error(e);
  res
    .status(e.status || 500)
    .json({
      error: e.status ? e.message : "Something went wrong. Please try again.",
    });
});
server.listen(
  Number(process.env.PORT) || 3000,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `AutoCollective running at http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3000}`,
    ),
);
function shutdown() {
  io.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

