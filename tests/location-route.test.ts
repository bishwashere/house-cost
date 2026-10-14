import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../app/api/location/route";
import { defaultLocation } from "../lib/location";

test("ZIP route returns the built-in default without a network call", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected fetch"); });
  const response = await GET(new NextRequest("http://localhost/api/location?zip=17011"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), defaultLocation);
  assert.equal(fetch.mock.callCount(), 0);
});

test("ZIP route returns adjusted estimates from the resolved state", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ places: [{ "place name": "San Francisco", "state abbreviation": "CA" }] }));
  const response = await GET(new NextRequest("http://localhost/api/location?zip=94103"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.zip, "94103");
  assert.equal(body.state, "CA");
  assert.equal(body.area, "Bay Area");
  assert.equal(body.tax, 0.7);
  assert.equal(body.insurance, 2300);
  assert.equal(body.utilities, 420);
  assert.equal(body.maintenance, 1.27);
});

test("ZIP route handles malformed, unknown and failed lookups", async t => {
  const invalid = await GET(new NextRequest("http://localhost/api/location?zip=123"));
  assert.equal(invalid.status, 400);
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 404 }));
  const unknown = await GET(new NextRequest("http://localhost/api/location?zip=00000"));
  assert.equal(unknown.status, 404);
  assert.match((await unknown.json()).error, /Default estimates/);
  fetch.mock.mockImplementation(async () => { throw new Error("Offline"); });
  const unavailable = await GET(new NextRequest("http://localhost/api/location?zip=94103"));
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /Default estimates/);
});
