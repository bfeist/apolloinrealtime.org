import { timeStrToSeconds } from "../../shell/clock.js";

export interface SampleCollection {
  name: string;
  seconds: number | null;
  samples: readonly string[];
}
export interface SamplePublication {
  year: string;
  title: string;
  authors: string;
  journal: string;
  url: string;
  samples: readonly string[];
}
export interface SampleCatalogLink {
  label: string;
  url: string;
}
const CURATOR = "https://curator.jsc.nasa.gov/lunar";

/** Preserve untimed return containers; missing collection times must never seek to zero. */
export function parseSampleCollections(rows: readonly string[][]): SampleCollection[] {
  return rows.flatMap((row) => {
    const name = row[2]?.trim();
    const samples = row[5]?.match(/\b\d{5}\b/g) ?? [];
    if (!name || !samples.length) return [];
    const time = row[0]?.trim() ?? "";
    const seconds = /^\d{3}:[0-5]\d:[0-5]\d$/.test(time) ? timeStrToSeconds(time) : null;
    return [{ name, seconds, samples: [...new Set(samples)] }];
  });
}

/** Columns 0=document number, 1=applicable samples, 2=compendium/catalog. */
export function sampleCatalogLinks(rows: readonly string[][], sample: string): SampleCatalogLink[] {
  const links: SampleCatalogLink[] = [
    {
      label: "NASA sample curation record",
      url: `${CURATOR}/samplecatalog/sampleinfo.cfm?sample=${sample}`,
    },
  ];
  for (const row of rows) {
    const applicable: readonly string[] = row[1]?.match(/\b\d{5}\b/g) ?? [];
    if (!applicable.includes(sample) || !/^\d{5}$/.test(row[0] ?? "")) continue;
    const document = row[0] ?? "";
    if (row[2] === "compendium")
      links.push({ label: "Lunar Sample Compendium (PDF)", url: `${CURATOR}/lsc/${document}.pdf` });
    else if (row[2] === "catalog")
      links.push({
        label: "Lunar Sample Information Catalog (PDF)",
        url: `${CURATOR}/catalogs/apollo11/${document}.pdf`,
      });
  }
  return links;
}

export function parseSamplePublications(rows: readonly string[][]): SamplePublication[] {
  return rows.flatMap((row) => {
    const title = row[2]?.trim();
    const year = row[1]?.trim() ?? "";
    if (!title || !/^\d{4}$/.test(year)) return [];
    const doi = row[9]?.trim() ?? "";
    const bibcode = row[0]?.trim() ?? "";
    // The historical index includes HTTP DOI links. Normalize those to HTTPS.
    const url = /^https?:\/\/(?:dx\.)?doi\.org\//.test(doi)
      ? doi.replace(/^http:/, "https:")
      : bibcode
        ? `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(bibcode)}/abstract`
        : `https://scholar.google.com/scholar?q=${encodeURIComponent(`${year} ${title}`)}`;
    return [
      {
        year,
        title,
        authors: row[3]?.trim() ?? "",
        journal: [
          row[4],
          row[5] ? `Vol. ${row[5]}` : "",
          row[6] ? `Issue ${row[6]}` : "",
          row[7] ? `p. ${row[7]}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        url,
        samples: [...new Set(row[10]?.match(/\b\d{5}\b/g) ?? [])],
      },
    ];
  });
}

export function parseSamplePhotos(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[|\r\n]/)
        .map((id) => id.trim())
        .filter((id) => /^[\w,-]+$/.test(id)),
    ),
  ];
}
export function samplePhotoUrls(id: string): { image: string; page: string } {
  const encoded = encodeURIComponent(id);
  return {
    image: `${CURATOR}/samplecatalog/photos/thumbs/${encoded}.jpg`,
    page: `${CURATOR}/samplecatalog/photoinfo.cfm?photo=${encoded}`,
  };
}
