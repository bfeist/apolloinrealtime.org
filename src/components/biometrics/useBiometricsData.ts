import { useQuery } from "@tanstack/react-query";
import { loadBiometrics } from "./data.js";

export function useBiometricsData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "biometrics"],
    queryFn: ({ signal }) =>
      loadBiometrics(`/${config.id}/`, {
        fetchFn: (url) => fetch(url, { signal }),
      }),
    enabled: config.id === "17",
    staleTime: Infinity,
  });
}
