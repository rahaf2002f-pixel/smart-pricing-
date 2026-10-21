import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AccountRoot.jsx";
import "./styles.css";
import "./account.css";
import "./responsiveEnhancements.css";
import "./i18n/layout.css";
import "./notifications.css";
import "./visualRefinements.css";
import { I18nProvider } from "./i18n/I18nProvider.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider><App /></I18nProvider>
  </React.StrictMode>,
);
