import { QueryClient } from "@tanstack/react-query";

// Like issirt: remote data belongs in Query, interaction state in Zustand.
// Mission indexes are immutable during a visit; switching tabs reuses them.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
