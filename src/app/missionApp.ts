import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../App.js";
import "../styles/index.css";
import "../styles/missions/11.css";
import "../styles/missions/13.css";
import "../styles/missions/17.css";
import "../styles/landing.css";

// Load every route stylesheet with the application. React route transitions must
// never wait for a body-mounted stylesheet before painting the next screen.
// Landing rules are scoped to body[data-mission="landing"], so they cannot leak
// into a mission once PageHead changes the body state.
// All four static HTML entry points boot the same routed React application.
const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing");
createRoot(root).render(createElement(App));
