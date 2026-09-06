import { useQuery } from "@tanstack/react-query";
import { loadCsv } from "../../data/csvLoader.js";
import { parseSampleCollections, parseSamplePhotos, parseSamplePublications } from "./data.js";

/** Optional catalogs may fail independently without hiding collection moments. */
export function useSamplesData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "samples"],
    queryFn: async ({ signal }) => {
      const root = `/${config.id}/indexes/`;
      const options: LoadCsvOptions = { fetchFn: (url) => fetch(url, { signal }) };
      const [collections, catalog, papers] = await Promise.allSettled([
        loadCsv(`${root}geoData.csv`, options),
        loadCsv(`${root}geoCompendiumData.csv`, options),
        loadCsv(`${root}paperData.csv`, options),
      ]);
      if (collections.status === "rejected")
        throw new Error("The sample collection index could not be loaded.");
      return {
        collections: parseSampleCollections(collections.value),
        catalog: catalog.status === "fulfilled" ? catalog.value : [],
        papers: parseSamplePublications(papers.status === "fulfilled" ? papers.value : []),
      };
    },
    staleTime: Infinity,
  });
}

/** Fetch sample photography only when its disclosure is first expanded. */
export function useSamplePhotos(config: MissionConfig, sample: string, enabled: boolean) {
  return useQuery({
    queryKey: ["mission", config.id, "samplePhotos", sample],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/${config.id}/indexes/geosampledetails/${sample}.csv`, {
        signal,
      });
      if (!response.ok) throw new Error(`Sample photography: ${String(response.status)}`);
      return parseSamplePhotos(await response.text());
    },
    enabled,
    staleTime: Infinity,
  });
}
