import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../App.js";
import "../styles/global.css";

// Route components own their CSS Modules; only document-level tokens are global.
// All four static HTML entry points boot the same routed React application.
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(createElement(App));
