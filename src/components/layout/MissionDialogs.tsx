import { useEffect, useRef } from "react";
import { MissionAboutContent } from "./MissionAboutContent.js";
import styles from "../../styles/base.module.css";
import { cx } from "../../styles/classNames.js";

export function MissionDialogs({
  config,
  about,
  shareUrl,
  onClose,
}: {
  config: MissionConfig;
  about: boolean;
  shareUrl: string | null;
  onClose: () => void;
}) {
  const aboutRef = useRef<HTMLDialogElement>(null);
  const shareRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dialog = aboutRef.current;
    if (!dialog) return;
    if (about && !dialog.open) {
      if (config.id === "17") dialog.show();
      else dialog.showModal();
    } else if (!about && dialog.open) dialog.close();
  }, [about, config.id]);
  useEffect(() => {
    const dialog = shareRef.current;
    if (!dialog) return;
    if (shareUrl !== null && !dialog.open) {
      dialog.showModal();
      inputRef.current?.select();
    } else if (shareUrl === null && dialog.open) dialog.close();
  }, [shareUrl]);
  return (
    <>
      <dialog ref={shareRef} id="shareDialog" className={styles.airtDialog} onClose={onClose}>
        <form method="dialog">
          <button className={styles.airtBtn} aria-label="Close share dialog">
            Close
          </button>
        </form>
        <h2>Share this moment</h2>
        <label htmlFor="shareUrl">
          Copy this link to return to the same mission time and channel.
        </label>
        <input ref={inputRef} id="shareUrl" type="text" readOnly value={shareUrl ?? ""} />
      </dialog>
      <dialog
        ref={aboutRef}
        id="aboutDialog"
        className={cx(styles.airtDialog, styles.missionAbout)}
        onClose={onClose}
      >
        <form method="dialog">
          <button className={styles.airtBtn} aria-label="Close instructions and credits">
            ×
          </button>
        </form>
        <div style={{ display: "contents" }}>
          <MissionAboutContent config={config} />
        </div>
      </dialog>
    </>
  );
}
