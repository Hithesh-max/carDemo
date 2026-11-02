import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { io } from "socket.io-client";
const dir = mkdtempSync(path.join(tmpdir(), "ac-test-")),
  dbPath = path.join(dir, "test.sqlite"),
  base = "http://127.0.0.1:3101";
let child;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function start() {
  child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: "3101", DB_PATH: dbPath },
    stdio: "pipe",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/cars")).ok) return;
    } catch {}
    await pause(50);
  }
  throw new Error("Server failed to start");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  await new Promise((r) => {
    child.once("exit", r);
    child.kill("SIGTERM");
  });
}
async function request(url, { method = "GET", body, cookie, origin } = {}) {
  const r = await fetch(base + "/api" + url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function register(email, role = "buyer") {
  const r = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Test Person",
      email,
      password: "StrongPassword123!",
      role,
      company: role === "dealer" ? "Test Demo Cars" : "",
    },
  });
  assert.equal(r.status, 201);
  return r.cookie;
}
before(start);
after(async () => {
  await stop();
  rmSync(dir, { recursive: true, force: true });
});
test("Complete persistent buyer/dealer workflow and validation", async () => {
  const buyer = await register("b1@test.example"),
    second = await register("b2@test.example"),
    third = await register("b3@test.example"),
    dealer = await register("d1@test.example", "dealer"),
    otherDealer = await register("d2@test.example", "dealer");
  let r = await request("/groups", {
    method: "POST",
    cookie: buyer,
    body: { carId: "creta", city: "Mumbai", target: 2, days: 7 },
  });
  assert.equal(r.status, 201);
  const id = r.data.id;
  r = await request("/groups/" + id);
  assert.equal(r.data.group.count, 1);
  assert.equal(r.data.group.seed_count, 0);
  assert.equal(
    (
      await request(`/groups/${id}/join`, {
        method: "POST",
        cookie: buyer,
        body: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`/groups/${id}/join`, { method: "POST", body: {} })).status,
    401,
  );
  assert.equal(
    (
      await request(`/groups/${id}/join`, {
        method: "POST",
        cookie: dealer,
        body: {},
      })
    ).status,
    403,
  );
  const socket = io(base, { transports: ["websocket"] });
  await new Promise((r, j) => {
    socket.once("connect", r);
    socket.once("connect_error", j);
  });
  const seen = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No live update")), 3000);
    socket.once("update", (e) => {
      clearTimeout(timer);
      resolve(e);
    });
  });
  assert.equal(
    (
      await request(`/groups/${id}/join`, {
        method: "POST",
        cookie: second,
        body: {},
      })
    ).status,
    200,
  );
  assert.equal((await seen).kind, "membership");
  socket.disconnect();
  assert.equal(
    (
      await request(`/groups/${id}/join`, {
        method: "POST",
        cookie: third,
        body: {},
      })
    ).status,
    409,
  );
  const offer = {
    ex: 1550000,
    tax: 170500,
    insurance: 54250,
    fees: 3000,
    discount: 75000,
    delivery: 14,
    extras: "Standard warranty; demo quote.",
  };
  assert.equal(
    (
      await request(`/groups/${id}/bids`, {
        method: "POST",
        cookie: buyer,
        body: offer,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/groups/${id}/bids`, {
        method: "POST",
        cookie: dealer,
        body: { ...offer, discount: -1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/groups/${id}/bids`, {
        method: "POST",
        cookie: dealer,
        body: { ...offer, ex: "1550000" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/groups/${id}/bids`, {
        method: "POST",
        cookie: dealer,
        body: offer,
      })
    ).status,
    200,
  );
  r = await request("/groups/" + id);
  let bid = r.data.bids[0];
  assert.equal(bid.total, 1702750);
  assert.equal(bid.version, 1);
  assert.equal(
    (
      await request(`/groups/${id}/interest`, {
        method: "POST",
        cookie: third,
        body: { bidId: bid.id, version: 1, consent: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/groups/${id}/interest`, {
        method: "POST",
        cookie: buyer,
        body: { bidId: bid.id, version: 1, consent: false },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/groups/${id}/interest`, {
        method: "POST",
        cookie: buyer,
        body: { bidId: bid.id, version: 1, consent: true },
      })
    ).status,
    200,
  );
  await request(`/groups/${id}/bids`, {
    method: "POST",
    cookie: dealer,
    body: { ...offer, discount: 80000 },
  });
  assert.equal(
    (
      await request(`/groups/${id}/interest`, {
        method: "POST",
        cookie: second,
        body: { bidId: bid.id, version: 1, consent: true },
      })
    ).status,
    409,
  );
  r = await request("/me", { cookie: buyer });
  assert.equal(r.data.interests[0].bid_version, 1);
  assert.equal(r.data.interests[0].current_version, 2);
  assert.equal(r.data.interests[0].total, 1702750);
  await request(`/groups/${id}/bids`, {
    method: "POST",
    cookie: otherDealer,
    body: offer,
  });
  r = await request("/groups/" + id);
  assert.equal(r.data.bids.length, 2);
  assert.equal(r.data.bids.find((b) => b.id === bid.id).version, 2);
  assert.equal(
    (
      await request(`/groups/${id}/messages`, {
        method: "POST",
        cookie: third,
        body: { body: "Hello" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/groups/${id}/messages`, {
        method: "POST",
        cookie: buyer,
        body: { body: "<script>alert(1)</script>" },
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request("/favorites/creta", {
        method: "POST",
        cookie: buyer,
        body: {},
      })
    ).data.saved,
    true,
  );
  assert.equal(
    (
      await request("/favorites/creta", {
        method: "POST",
        cookie: buyer,
        body: {},
        origin: "https://evil.example",
      })
    ).status,
    403,
  );
  await stop();
  await start();
  r = await request("/me", { cookie: buyer });
  assert.equal(r.data.user.email, "b1@test.example");
  assert.ok(r.data.memberships.includes(id));
  assert.ok(r.data.favorites.includes("creta"));
  assert.equal(r.data.interests.length, 1);
  r = await request("/groups/" + id);
  assert.equal(r.data.messages[0].body, "<script>alert(1)</script>");
  await request(`/groups/${id}/join`, {
    method: "DELETE",
    cookie: buyer,
    body: {},
  });
  r = await request("/me", { cookie: buyer });
  assert.equal(r.data.interests.length, 0);
  assert.ok(!r.data.memberships.includes(id));
  const db = new DatabaseSync(dbPath);
  db.prepare("UPDATE groups SET expires=? WHERE id=?").run(Date.now() - 1, id);
  db.close();
  assert.equal(
    (
      await request(`/groups/${id}/join`, {
        method: "POST",
        cookie: third,
        body: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/groups/${id}/bids`, {
        method: "POST",
        cookie: dealer,
        body: offer,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/groups/${id}/messages`, {
        method: "POST",
        cookie: second,
        body: { body: "late" },
      })
    ).status,
    409,
  );
  await request("/auth/logout", { method: "POST", cookie: buyer, body: {} });
  assert.equal((await request("/me", { cookie: buyer })).data.user, null);
});
test("Validation and private data boundaries", async () => {
  assert.equal((await request("/groups/999999")).status, 404);
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: { name: "x", email: "bad", password: "short", role: "admin" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/auth/login", {
        method: "POST",
        body: { email: "buyer@demo.test", password: "wrong" },
      })
    ).status,
    401,
  );
  const { data } = await request("/groups/1");
  assert.ok(!JSON.stringify(data).includes("password"));
  assert.ok(!JSON.stringify(data).includes("buyer@demo.test"));
  assert.equal((await request("/dealer/interests")).status, 401);
  assert.equal(
    (
      await request("/groups", {
        method: "POST",
        body: { carId: "fake", city: "Mumbai", target: 0, days: 7 },
      })
    ).status,
    401,
  );
});
