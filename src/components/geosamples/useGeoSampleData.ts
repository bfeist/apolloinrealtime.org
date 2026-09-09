import { useQuery } from "@tanstack/react-query";
import { loadCsv } from "../../data/csvLoader.js";
import { parseSamplePublications } from "../samples/data.js";
import { parseGeoSampleBags, parseGeoSampleDetail } from "./data.js";

export function useGeoSampleIndex(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "geosamples"],
    queryFn: async ({ signal }) => {
      const root = `/${config.id}/indexes/`;
      const options: LoadCsvOptions = { fetchFn: (url) => fetch(url, { signal }) };
      const [bags, catalog, papers] = await Promise.all([
        loadCsv(`${root}geoData.csv`, options),
        loadCsv(`${root}geoCompendiumData.csv`, options),
        loadCsv(`${root}paperData.csv`, options),
      ]);
      const parsedBags = parseGeoSampleBags(bags);
      const byTimeId = new Map<string, (typeof parsedBags)[number][]>();
      for (const bag of parsedBags) {
        const atTime = byTimeId.get(bag.timeId) ?? [];
        atTime.push(bag);
        byTimeId.set(bag.timeId, atTime);
      }
      return {
        bags: parsedBags,
        byTimeId,
        catalog,
        papers: parseSamplePublications(papers),
      };
    },
    enabled: config.id === "17",
    staleTime: Infinity,
  });
}

export function useGeoSampleDetail(sample: string) {
  return useQuery({
    queryKey: ["lunarSampleDetail", sample],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `https://curator.jsc.nasa.gov/rest/lunarapi/samples/sampledetails/${encodeURIComponent(sample)}`,
        { signal },
      );
      if (!response.ok) throw new Error(`Sample information: ${String(response.status)}`);
      const value: unknown = await response.json();
      return parseGeoSampleDetail(value);
    },
    staleTime: Infinity,
  });
}
