import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AccountRoot.jsx";
import "./styles.css";
import "./account.css";
import "./responsiveEnhancements.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
