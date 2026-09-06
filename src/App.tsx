import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { queryClient } from "./api/queryClient.js";
import { LandingPage } from "./pages/LandingPage.js";
import { MissionPage } from "./pages/MissionPage.js";
import { a11Config } from "./missions/11.config.js";
import { a13Config } from "./missions/13.config.js";
import { a17Config } from "./missions/17.config.js";
import { useMissionStore } from "./store/missionStore.js";

// Initialize before mounting. Slow data requests cannot reset a newer user seek.
const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/index.html", element: <LandingPage /> },
  ...[a11Config, a13Config, a17Config].flatMap((config) => {
    const route = {
      loader: ({ request }: { request: Request }) => {
        useMissionStore.getState().initialize(config, new URL(request.url).search);
        return null;
      },
      element: <MissionPage key={config.id} config={config} />,
    };
    // Preserve explicit static entry URLs as well as the public mission routes.
    return [
      { path: `/${config.id}/`, ...route },
      { path: `/${config.id}/index.html`, ...route },
    ];
  }),
  {
    path: "*",
    element: (
      <main>
        <h1>Mission not found</h1>
        <a href="/">Choose an Apollo mission</a>
      </main>
    ),
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
