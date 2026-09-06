import { useLayoutEffect } from "react";

/** Keeps document metadata and the body style scope aligned with the active route. */
export function PageHead({ config }: { config?: MissionConfig }) {
  useLayoutEffect(() => {
    document.body.dataset.mission = config?.id ?? "landing";
    document.title = config ? `${config.name} in Real Time` : "Apollo in Real Time";

    const favicon = document.querySelector<HTMLLinkElement>('link[data-page-head="favicon"]');
    if (config) {
      const link = favicon ?? document.createElement("link");
      link.rel = "icon";
      link.dataset.pageHead = "favicon";
      link.href = `/${config.id}/favicons/favicon.ico`;
      if (!favicon) document.head.append(link);
    } else {
      favicon?.remove();
    }
  }, [config]);
  return null;
}
