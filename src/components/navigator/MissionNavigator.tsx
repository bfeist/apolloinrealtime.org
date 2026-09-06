import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavigatorRenderer } from "../../engines/navigator/renderer.js";
import { useMissionStore } from "../../store/missionStore.js";
import {
  useMissionStagesData,
  useVideoSegmentData,
  usePhotoData,
  useTocData,
  useUtteranceData,
} from "../../api/useMissionData.js";

let paperRequest: Promise<PaperScopeLike> | undefined;
function loadPaper(missionId: string): Promise<PaperScopeLike> {
  paperRequest ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/${missionId}/lib/paper-full.js`;
    script.onload = () => {
      const paper = (window as unknown as { paper?: PaperScopeLike }).paper;
      if (paper) resolve(paper);
      else reject(new Error("The mission navigator could not be loaded."));
    };
    script.onerror = () => {
      paperRequest = undefined;
      reject(new Error("The mission navigator could not be loaded."));
    };
    document.head.append(script);
  });
  return paperRequest;
}

/** React owns the canvas lifetime; Paper owns only the drawing inside it. */
export function MissionNavigator({ config }: { config: MissionConfig }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stages = useMissionStagesData(config);
  const videos = useVideoSegmentData(config);
  const photos = usePhotoData(config);
  const toc = useTocData(config);
  const utterances = useUtteranceData(config);
  const paper = useQuery({
    queryKey: ["paper"],
    queryFn: () => loadPaper(config.id),
    structuralSharing: false,
  });
  const [error, setError] = useState("");
  const ready = ![stages, videos, photos, toc, utterances].some((query) => query.isPending);
  useEffect(() => {
    if (!canvas.current || !paper.data || !ready) return;
    const renderer = new NavigatorRenderer(paper.data, {
      missionDurationSeconds: config.missionDurationSeconds,
      countdownSeconds: config.countdownSeconds,
      overlays: {
        ...(stages.data && { stages: stages.data }),
        ...(videos.data && { videoSegments: videos.data }),
        ...(photos.data && { photos: photos.data }),
        ...(toc.data && { toc: toc.data }),
        ...(utterances.data && { utterances: utterances.data }),
      },
      onSeek: (seconds) => {
        useMissionStore.getState().seek(seconds);
      },
    });
    try {
      renderer.mount(canvas.current);
    } catch (reason) {
      setError(String(reason));
      return;
    }
    renderer.render(useMissionStore.getState().seconds);
    const unsubscribe = useMissionStore.subscribe((state, previous) => {
      if (
        Math.floor(state.seconds) !== Math.floor(previous.seconds) ||
        state.seekRevision !== previous.seekRevision
      )
        renderer.render(state.seconds);
    });
    return () => {
      unsubscribe();
      renderer.destroy();
    };
  }, [config, paper.data, ready, stages.data, videos.data, photos.data, toc.data, utterances.data]);
  return (
    <>
      <canvas
        ref={canvas}
        id="navCanvas"
        width={1200}
        height={160}
        aria-label="Mission navigator timeline"
      />
      {(error || paper.error) && (
        <p role="status">Mission navigator unavailable. Use GET or timestamps to seek.</p>
      )}
    </>
  );
}
