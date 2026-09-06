import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { useMissionStore } from "../../store/missionStore.js";

/** Follow a new time selection once; manual browsing is left alone between selections. */
export function useFollowActiveRow(
  root: RefObject<HTMLElement | null>,
  activeId: string | undefined,
): void {
  const textTab = useMissionStore((state) => state.textTab);
  useLayoutEffect(() => {
    const align = (): void => {
      const container = root.current?.parentElement;
      const row = activeId ? document.getElementById(activeId) : null;
      if (!container || !row || !container.clientHeight) return;
      container.scrollTop +=
        row.getBoundingClientRect().top - container.getBoundingClientRect().top - 24;
    };
    align();
    void document.fonts.ready.then(align);
    document.fonts.addEventListener("loadingdone", align);
    return () => {
      document.fonts.removeEventListener("loadingdone", align);
    };
  }, [root, activeId, textTab]);
}
