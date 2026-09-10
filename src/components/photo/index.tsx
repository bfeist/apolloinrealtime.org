import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { usePhotoData } from "../../api/useMissionData.js";
import { findClosestPhotoIndex } from "../../data/photoData.js";
import { useMissionStore } from "../../store/missionStore.js";
import { galleryItemId, photoResolverFor } from "./model.js";
import { sanitizePhotoCaption } from "./caption.js";
import styles from "./PhotoPanel.module.css";
import layout from "../../styles/base.module.css";
import { cx } from "../../styles/classNames.js";

export function PhotoPanel({ config }: { config: MissionConfig }) {
  const { data, error } = usePhotoData(config);
  const activeIndex = useMissionStore((state) =>
    data ? findClosestPhotoIndex(data, state.seconds) : -1,
  );
  const seek = useMissionStore((state) => state.seek);
  const hidden = useMissionStore((state) => state.rightTab !== "photo");
  const initialRevision = useRef(useMissionStore.getState().seekRevision);
  const linkedPhotoApplied = useRef(false);
  const gallery = useRef<HTMLDivElement>(null);
  const resolveUrls = useMemo(() => photoResolverFor(config), [config]);
  const entry = data?.entries[activeIndex];
  const urls = entry ? resolveUrls(entry) : undefined;

  // A late photo response must never replace a seek made while it was loading.
  useEffect(() => {
    if (!data || linkedPhotoApplied.current) return;
    linkedPhotoApplied.current = true;
    const requested = new URLSearchParams(window.location.search).get("img");
    const linked = data.entries.find((photo) => photo.photoId === requested);
    if (linked && useMissionStore.getState().seekRevision === initialRevision.current)
      seek(linked.seconds);
  }, [data, seek]);
  useLayoutEffect(() => {
    const container = gallery.current;
    const thumb = entry ? document.getElementById(galleryItemId(entry.timeId)) : null;
    if (!container || !thumb || hidden) return;
    container.scrollTop +=
      thumb.getBoundingClientRect().top - container.getBoundingClientRect().top - 8;
  }, [entry, hidden]);

  return (
    <>
      <div id="photodiv" className={layout.airtPhotodiv} hidden={hidden}>
        {error && <>failed: {error.message}</>}
        {entry && urls && (
          <div className={styles.imageBlock}>
            <a
              href={urls.highRes}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.selectedPhotoLink}
              data-testid="selected-photo-link"
              aria-label={`Open full-resolution photo ${entry.photoId} in a new window`}
            >
              <img
                src={urls.full}
                alt={entry.photoId}
                className={styles.selectedPhoto}
                data-testid="selected-photo"
              />
            </a>
            <div
              className={styles.photodivcaption}
              data-testid="photo-caption"
              // Historical captions contain links; the allowlist keeps only safe anchors and text.
              dangerouslySetInnerHTML={{ __html: sanitizePhotoCaption(entry.description) }}
            />
            <div className={styles.photoMeta}>
              {entry.timeStr} · {entry.photoId}
              {entry.credit === "" ? "" : ` · ${entry.credit}`}
            </div>
          </div>
        )}
      </div>
      <div id="photoGallery" className={layout.airtPhotoRail} ref={gallery} hidden={hidden}>
        {data?.entries.map((photo, index) => (
          <button
            type="button"
            key={index}
            aria-label={`View photo ${photo.photoId} at ${photo.timeStr}`}
            className={cx(styles.galleryItemContainer, entry === photo && styles.selected)}
            id={galleryItemId(photo.timeId)}
            data-timeid={photo.timeId}
            aria-current={entry === photo ? "true" : undefined}
            onClick={() => {
              seek(photo.seconds);
            }}
          >
            <img
              className={cx(styles.galleryImage, layout.galleryImage)}
              loading="lazy"
              src={resolveUrls(photo).thumb}
              alt={photo.photoId}
            />
            <div className={styles.galleryOverlay}>{photo.timeStr}</div>
          </button>
        ))}
      </div>
    </>
  );
}
