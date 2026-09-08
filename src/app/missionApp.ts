import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../App.js";
import "../styles/global.css";

// Route components own their CSS Modules; only document-level tokens are global.
// The single source HTML entry boots the routed React application on every route.
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(createElement(App));
