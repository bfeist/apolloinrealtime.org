/**
 * Photo panel.
 *
 * Phase 5 Track C — typed, jQuery-free replacement for the legacy
 * `#photoGallery` + `#photodiv` + `populatePhotoGallery` / `showPhotoByTimeId`
 * / `loadPhotoHtml` / `galleryClick` chain in `legacy-src/{N}/index.js`.
 *
 * Renders:
 *   - a gallery strip of thumbnails (`<div class="galleryItemContainer"
 *     id="gallerytimeid{timeId}">`) so existing `styles.css` rules
 *     continue to apply, and
 *   - a selected-photo area below it (the legacy `#photodiv` block).
 *
 * URL resolution is mission-specific (A11 → LPI CDN, A13 → LPI mirror,
 * A17 → media CDN) and so is passed in as a {@link PhotoUrlResolver}
 * rather than encoded here. The harness wires the mission-appropriate
 * resolver.
 *
 * No native lazy-loading library — uses the platform `loading="lazy"`
 * attribute, replacing the legacy `$('img').lazyload(...)` call.
 */

import { delegate } from "../../dom/index.js";

/** Result of resolving a {@link PhotoEntry}'s image URLs. */
export interface PhotoUrls {
  /** Small thumb shown in the gallery strip. */
  thumb: string;
  /** Larger image shown in the selected-photo area. */
  full: string;
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

/** Options for {@link createPhotoPanel}. */
export interface PhotoPanelOptions {
  /** Container element. Cleared and populated. */
  container: HTMLElement;
  /** Parsed photo data (from `src/data/photoData.ts`). */
  data: PhotoData;
  /** Mission-specific URL resolver. */
  resolveUrls: PhotoUrlResolver;
  /** Called when the user clicks a thumbnail. */
  onSeek: (timeId: string) => void;
}

export interface PhotoPanelHandle {
  /**
   * Highlight + scroll-to the thumb for `timeId`, and load the full image
   * into the selected-photo area. If `timeId` is null or not in the data
   * the panel just clears the selection.
   */
  setActiveTimeId: (timeId: string | null) => void;
  /** Tear down listeners and empty the container. */
  destroy: () => void;
}

/** DOM id for the gallery thumbnail representing `timeId`. */
export function galleryItemId(timeId: string): string {
  return `gallerytimeid${timeId}`;
}

export function createPhotoPanel(options: PhotoPanelOptions): PhotoPanelHandle {
  const { container, data, resolveUrls, onSeek } = options;
  container.textContent = "";

  const gallery = document.createElement("div");
  gallery.id = "photoGallery";
  gallery.className = "photoGallery";

  const photoDiv = document.createElement("div");
  photoDiv.id = "photodiv";
  photoDiv.className = "photodiv";

  for (const entry of data.entries) {
    const urls = resolveUrls(entry);
    const item = document.createElement("div");
    item.className = "galleryItemContainer";
    item.id = galleryItemId(entry.timeId);
    item.dataset.timeid = entry.timeId;

    const img = document.createElement("img");
    img.className = "galleryImage";
    img.loading = "lazy";
    img.src = urls.thumb;
    img.alt = entry.photoId;
    item.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "galleryOverlay";
    overlay.textContent = entry.timeStr;
    item.appendChild(overlay);

    gallery.appendChild(item);
  }

  container.appendChild(gallery);
  container.appendChild(photoDiv);

  const off = delegate(gallery, "click", ".galleryItemContainer", (_ev, el) => {
    const timeId = el.dataset.timeid;
    if (timeId !== undefined && timeId !== "") onSeek(timeId);
  });

  let activeEl: HTMLElement | null = null;

  const renderFull = (entry: PhotoEntry): void => {
    const urls = resolveUrls(entry);
    photoDiv.textContent = "";
    const block = document.createElement("div");
    block.className = "imageBlock";
    const cap = document.createElement("div");
    cap.className = "photodivcaption";
    cap.textContent = entry.description;
    const meta = document.createElement("div");
    meta.className = "photoMeta";
    meta.textContent = `${entry.timeStr} · ${entry.photoId}${entry.credit === "" ? "" : ` · ${entry.credit}`}`;
    const img = document.createElement("img");
    img.src = urls.full;
    img.alt = entry.photoId;
    img.className = "selectedPhoto";
    block.appendChild(img);
    block.appendChild(cap);
    block.appendChild(meta);
    photoDiv.appendChild(block);
  };

  const setActiveTimeId = (timeId: string | null): void => {
    if (timeId === null || !data.byTimeId.has(timeId)) {
      if (activeEl !== null) {
        activeEl.classList.remove("selected");
        activeEl = null;
      }
      return;
    }
    const el = gallery.querySelector<HTMLElement>(`#${CSS.escape(galleryItemId(timeId))}`);
    if (el === null || el === activeEl) return;
    if (activeEl !== null) activeEl.classList.remove("selected");
    el.classList.add("selected");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    activeEl = el;
    const idx = data.byTimeId.get(timeId);
    if (idx !== undefined) {
      const entry = data.entries[idx];
      if (entry) renderFull(entry);
    }
  };

  const destroy = (): void => {
    off();
    container.textContent = "";
    activeEl = null;
  };

  return { setActiveTimeId, destroy };
}
