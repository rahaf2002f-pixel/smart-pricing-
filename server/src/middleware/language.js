import { translateApiMessage } from "../../../shared/i18n/messages.js";

// Localize only public API messages. Never rewrite user content or numeric data.
export function localizeResponse(req, res, next) {
  req.language = /^en\b/i.test(req.get("Accept-Language") || "") ? "en" : "ar";
  res.set("Content-Language", req.language);
  res.vary("Accept-Language");
  const json = res.json;
  res.json = function localizedJson(payload) {
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      payload = { ...payload };
      if (typeof payload.message === "string") payload.message = translateApiMessage(payload.message, req.language);
      if (payload.errors && typeof payload.errors === "object") {
        payload.errors = Object.fromEntries(Object.entries(payload.errors).map(([key, value]) => [key, translateApiMessage(value, req.language)]));
      }
    }
    return json.call(this, payload);
  };
  next();
}
