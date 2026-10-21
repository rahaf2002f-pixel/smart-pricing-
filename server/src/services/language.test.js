import test from "node:test";
import assert from "node:assert/strict";
import { apiEnglish, translateApiMessage } from "../../../shared/i18n/messages.js";
import { localizeResponse } from "../middleware/language.js";
import arabic from "../../../client/src/i18n/locales/ar.js";
import english from "../../../client/src/i18n/locales/en.js";
import { translate } from "../../../client/src/i18n/runtime.js";
import { NOTIFICATION_DEFINITIONS } from "../../../shared/notifications.js";

test("UI catalogs match and all notification definitions have English translations", () => {
  assert.deepEqual(Object.keys(arabic).sort(), Object.keys(english).sort());
  for (const key of Object.keys(english)) assert(!/\p{Script=Arabic}/u.test(translate(key, {}, "en")), key);
  for (const item of Object.values(NOTIFICATION_DEFINITIONS)) {
    assert(!/\p{Script=Arabic}/u.test(translate(item.title, {}, "en")), item.title);
    assert(!/\p{Script=Arabic}/u.test(translate(item.message, {}, "en")), item.message);
  }
});

test("all API catalog messages have static English translations and can switch back to Arabic", () => {
  for (const [ar, en] of Object.entries(apiEnglish)) {
    assert(en && !/\p{Script=Arabic}/u.test(en), ar);
    assert.equal(translateApiMessage(ar, "en"), en);
    assert.equal(translateApiMessage(en, "ar"), ar);
  }
  assert.equal(translateApiMessage("يمكن إضافة حتى 20 بنود تكلفة.", "en"), "You can add up to 20 cost items.");
});

test("API localization changes only messages and validation errors, never user content or amounts", () => {
  let payload;
  const req = { get: () => "en-US,en;q=0.9" };
  const res = { set() {}, vary() {}, json(value) { payload = value; return this; } };
  localizeResponse(req, res, () => {});
  res.json({ message: "تحقق من بيانات التسجيل.", errors: { email: "أدخل بريدًا إلكترونيًا صحيحًا." }, product: { name: "منتج عربي", price: 12.375 } });
  assert.equal(req.language, "en");
  assert.equal(payload.message, "Check your registration details.");
  assert.equal(payload.errors.email, "Enter a valid email address.");
  assert.deepEqual(payload.product, { name: "منتج عربي", price: 12.375 });
});

test("new visitors and unsupported language headers default to Arabic", () => {
  for (const header of ["", "fr", "ar-KW"]) {
    const req = { get: () => header };
    const res = { set() {}, vary() {}, json: (value) => value };
    localizeResponse(req, res, () => {});
    assert.equal(req.language, "ar");
    assert.equal(res.json({ message: "تحقق من بيانات التسجيل." }).message, "تحقق من بيانات التسجيل.");
  }
});
