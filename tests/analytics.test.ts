import test from "node:test";
import assert from "node:assert/strict";
import { analyticsCommands, analyticsSettings, isAnalyticsPage, parseAnalyticsChoice, privacySignal } from "../lib/analytics";

test("analytics is disabled without a valid measurement ID and never runs on preview or non-home URLs", () => {
  assert.equal(analyticsSettings(), null);
  assert.equal(analyticsSettings("AW-12345678"), null);
  const settings = analyticsSettings("G-TESTONLY99")!;
  assert.equal(isAnalyticsPage(settings, { origin: "https://howmuchhousecaniafford.azent.io", pathname: "/" }), true);
  assert.equal(isAnalyticsPage(settings, { origin: "https://house-cost.vercel.app", pathname: "/" }), false);
  assert.equal(isAnalyticsPage(settings, { origin: "https://house-cost-preview.vercel.app", pathname: "/" }), false);
  assert.equal(isAnalyticsPage(settings, { origin: "https://howmuchhousecaniafford.azent.io", pathname: "/not-home" }), false);
});

test("only explicit Allow is recognized and privacy signals block measurement", () => {
  assert.notEqual(parseAnalyticsChoice(null), "allow");
  assert.notEqual(parseAnalyticsChoice("true"), "allow");
  assert.equal(parseAnalyticsChoice("deny"), "deny");
  assert.equal(parseAnalyticsChoice("allow"), "allow");
  assert.equal(privacySignal(true, "0"), true);
  assert.equal(privacySignal(false, "1"), true);
  assert.equal(privacySignal(false, undefined, "yes"), true);
  assert.equal(privacySignal(false, null, "0"), false);
});

test("tag sends one explicit canonical page view with no referrer, and denies ad collection", () => {
  const settings = analyticsSettings("G-TESTONLY99")!;
  const commands = analyticsCommands(settings, new Date("2026-01-01"));
  assert.deepEqual(commands.filter(([action]) => action === "event"), [["event", "page_view", {
    page_location: "https://howmuchhousecaniafford.azent.io/",
    page_referrer: "",
    page_title: "How Much House Can I Afford?",
    ignore_referrer: true,
    send_to: "G-TESTONLY99",
  }]]);
  assert.equal(commands[0][2].analytics_storage, "denied");
  assert.equal(commands[1][2].analytics_storage, "granted");
  assert.equal(commands[1][2].ad_storage, "denied");
  assert.equal(commands[1][2].ad_user_data, "denied");
  assert.equal(commands[1][2].ad_personalization, "denied");
  assert.equal(commands[4][2].send_page_view, false);
  assert.equal(commands[4][2].allow_google_signals, false);
  assert.equal(commands[4][2].allow_ad_personalization_signals, false);
});
