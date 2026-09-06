/** Result of resolving a {@link PhotoEntry}'s image URLs. */
export interface PhotoUrls {
  /** Small thumb shown in the gallery strip. */
  thumb: string;
  /** Larger image shown in the selected-photo area. */
  full: string;
  /** Highest-resolution image available, opened from the selected photo. */
  highRes: string;
}

/** Mission-specific URL builder. */
export type PhotoUrlResolver = (entry: PhotoEntry) => PhotoUrls;

/**
 * Match the legacy `AS{mission}-{roll}-{img}` regex. Returns
 * `{ rollNum, imgNum }` or `null` if `photoId` doesn't match.
 *
 * Both A11 and A13 use this pattern; A17 uses a different naming scheme
 * (handled in its own resolver).
 */
export function parseAsRollImg(
  photoId: string,
  missionDigit: "11" | "13",
): { rollNum: string; imgNum: string } | null {
  const re = new RegExp(`AS${missionDigit}-(\\d\\d)-(\\d\\d\\d\\d.?)`);
  const m = re.exec(photoId);
  if (m === null) return null;
  const [, rollNum, imgNum] = m;
  if (rollNum === undefined || imgNum === undefined) return null;
  return { rollNum, imgNum };
}

export function galleryItemId(timeId: string): string {
  return `gallerytimeid${timeId}`;
}

/** Per-mission photo URL resolver. Mirrors legacy `populatePhotoGallery`. */
export function photoResolverFor(config: MissionConfig): PhotoUrlResolver {
  const mediaRoot = config.mediaRoot;
  return (entry) => {
    if (config.id === "13") {
      const lpi = config.lpiImageRoot ?? "";
      const alsj = config.alsjImageRoot ?? "";
      const parts = parseAsRollImg(entry.photoId, "13");
      if (parts) {
        return {
          thumb: `${lpi}/thumb/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
          full: `${lpi}/medium/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
          highRes: `${lpi}/print/AS13/${parts.rollNum}/${parts.imgNum}.jpg`,
        };
      }
      if (entry.supportingFilename !== "") {
        const url = `${mediaRoot}/images/supporting/${entry.supportingFilename}`;
        return { thumb: url, full: url, highRes: url };
      }
      const url = `${alsj}/${entry.filename}`;
      return { thumb: url, full: url, highRes: url };
    }

    if (config.id === "11") {
      const lpi = config.lpiCdnRoot ?? "";
      const parts = parseAsRollImg(entry.photoId, "11");
      if (parts) {
        const thumb = `${lpi}/resources/apollo/images/thumb/AS11/${parts.rollNum}/${parts.imgNum}.jpg`;
        const full =
          entry.filename !== ""
            ? `${mediaRoot}/images/NASA_photos/${entry.filename}`
            : entry.supportingFilename ||
              `${lpi}/resources/apollo/images/print/AS11/${parts.rollNum}/${parts.imgNum}.jpg`;
        return { thumb, full, highRes: full };
      }
      if (entry.supportingFilename !== "") {
        return {
          thumb: entry.supportingFilename,
          full: entry.supportingFilename,
          highRes: entry.supportingFilename,
        };
      }
      const url = `${mediaRoot}/images/NASA_photos/${entry.filename}`;
      return { thumb: url, full: url, highRes: url };
    }

    // A17
    const isFlight = entry.filename !== "";
    const subdir = isFlight ? "flight" : "supporting";
    const base = isFlight ? `AS17-${entry.photoId}` : entry.photoId;
    const fullSize = isFlight ? "4175" : "2100";
    return {
      thumb: `${mediaRoot}/images/${subdir}/100/${base}.jpg`,
      full: `${mediaRoot}/images/${subdir}/${fullSize}/${base}.jpg`,
      highRes: `${mediaRoot}/images/${subdir}/${fullSize}/${base}.jpg`,
    };
  };
}
