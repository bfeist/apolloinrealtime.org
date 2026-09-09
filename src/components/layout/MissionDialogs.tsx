import { useEffect, useRef, useState } from "react";
import { channelInfo, channelsFor } from "../mocrviz/channels.js";
import { MissionAboutContent } from "./MissionAboutContent.js";
import styles from "../../styles/base.module.css";
import dialogStyles from "./MissionDialogs.module.css";
import { cx } from "../../styles/classNames.js";

type CopyState = "COPY LINK" | "LINK COPIED" | "COPY FAILED";

async function copyShareText(text: string, textarea: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!textarea) return false;
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    // Retain the original site's fallback for browsers without Clipboard API access.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand("copy");
  }
}

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
  const websiteRef = useRef<HTMLTextAreaElement>(null);
  const momentRef = useRef<HTMLTextAreaElement>(null);
  const [websiteCopyState, setWebsiteCopyState] = useState<CopyState>("COPY LINK");
  const [momentCopyState, setMomentCopyState] = useState<CopyState>("COPY LINK");
  const websiteUrl = `https://apolloinrealtime.org/${config.id}${config.id === "17" ? "/" : ""}`;
  const shareTime = shareUrl ? new URL(shareUrl).searchParams.get("t") : null;
  const sharedChannel = shareUrl ? new URL(shareUrl).searchParams.get("ch") : null;
  const catalog = channelsFor(config.id);
  const channelLabel =
    catalog && sharedChannel
      ? (channelInfo(catalog, Number(sharedChannel))?.label ?? "Main space-to-ground")
      : "Main space-to-ground";
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
      setWebsiteCopyState("COPY LINK");
      setMomentCopyState("COPY LINK");
      dialog.showModal();
    } else if (shareUrl === null && dialog.open) dialog.close();
  }, [shareUrl]);
  return (
    <>
      <dialog
        ref={shareRef}
        id="shareDialog"
        className={dialogStyles.shareDialog}
        aria-labelledby="shareWebsiteHeading"
        onClose={onClose}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const outsideDialog =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;
          if (outsideDialog) onClose();
        }}
      >
        <form method="dialog" className={dialogStyles.closeForm}>
          <button className={dialogStyles.closeButton} aria-label="Close share dialog">
            Close share dialog
          </button>
        </form>
        <div className={dialogStyles.shareModalWrapper}>
          <h2 id="shareWebsiteHeading" className={dialogStyles.headline}>
            Share Website
          </h2>
          <div className={dialogStyles.body}>
            <textarea
              ref={websiteRef}
              id="shareWebsiteURL"
              className={dialogStyles.monitor}
              rows={2}
              readOnly
              value={websiteUrl}
              aria-label="Website link"
            />
            <button
              id="shareModalCopyWebsiteLinkAction"
              className={dialogStyles.copyButton}
              type="button"
              onClick={() => {
                void copyShareText(websiteUrl, websiteRef.current).then((copied) => {
                  setWebsiteCopyState(copied ? "LINK COPIED" : "COPY FAILED");
                });
              }}
            >
              {websiteCopyState}
            </button>
          </div>

          <h2 className={dialogStyles.headline}>Share this Mission Moment</h2>
          <div className={dialogStyles.body}>
            Ground Elapsed Time:{" "}
            <span id="shareModelGET" className={dialogStyles.valueItem}>
              {shareTime}
            </span>
            <br />
            {config.id !== "17" && (
              <>
                Audio Channel:{" "}
                <span id="shareModelChannel" className={dialogStyles.valueItem}>
                  {channelLabel}
                </span>
                <br />
              </>
            )}
            <br />
            <textarea
              ref={momentRef}
              id="shareUrl"
              className={dialogStyles.monitor}
              rows={2}
              readOnly
              value={shareUrl ?? ""}
              aria-label="Mission moment link"
            />
            <button
              id="shareModalCopyLinkAction"
              className={dialogStyles.copyButton}
              type="button"
              onClick={() => {
                void copyShareText(shareUrl ?? "", momentRef.current).then((copied) => {
                  setMomentCopyState(copied ? "LINK COPIED" : "COPY FAILED");
                });
              }}
            >
              {momentCopyState}
            </button>
          </div>

          <h2 className={dialogStyles.headline}>Join our Forum</h2>
          <div className={dialogStyles.body}>
            Share and discuss moments of interest on this mission at{" "}
            <a href="https://forum.apolloinrealtime.org" target="_blank" rel="noreferrer">
              forum.apolloinrealtime.org
            </a>
          </div>
        </div>
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
