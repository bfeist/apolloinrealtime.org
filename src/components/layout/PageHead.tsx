import { useLayoutEffect } from "react";
import { pageHeadTags } from "../../app/pageMetadata.js";

/** Keeps document metadata and the body style scope aligned with the active route. */
export function PageHead({ config }: { config?: MissionConfig }) {
  useLayoutEffect(() => {
    document.body.dataset.mission = config?.id ?? "landing";
    document.head.querySelectorAll("[data-page-head]").forEach((node) => {
      node.remove();
    });
    for (const descriptor of pageHeadTags(config)) {
      const element = document.createElement(descriptor.tag);
      for (const [name, value] of Object.entries(descriptor.attrs)) {
        element.setAttribute(name, value);
      }
      if (descriptor.children !== undefined) element.textContent = descriptor.children;
      document.head.append(element);
    }
  }, [config]);
  return null;
}
