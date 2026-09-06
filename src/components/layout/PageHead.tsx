import { useLayoutEffect } from "react";
import missionCss from "../../styles/index.css?url";
import a11Css from "../../styles/missions/11.css?url";
import a13Css from "../../styles/missions/13.css?url";
import a17Css from "../../styles/missions/17.css?url";
import landingCss from "../../styles/landing.css?url";

const overrides: Record<string, string> = { "11": a11Css, "13": a13Css, "17": a17Css };

/** Route styles are removed on navigation so homepage resets cannot leak into missions. */
export function PageHead({ config }: { config?: MissionConfig }) {
  useLayoutEffect(() => {
    document.body.dataset.mission = config?.id ?? "landing";
    document.title = config ? `${config.name} in Real Time` : "Apollo in Real Time";
  }, [config]);
  return (
    <>
      <link rel="stylesheet" href={config ? missionCss : landingCss} />
      {config && <link rel="stylesheet" href={overrides[config.id]} />}
      <link
        rel="stylesheet"
        href={
          config
            ? "https://fonts.googleapis.com/css2?family=Michroma&family=Oswald:wght@300;400;700&family=Roboto+Mono:wght@200;400;500;700&family=Roboto+Slab:wght@300&display=swap"
            : "https://fonts.googleapis.com/css2?family=Michroma&family=Roboto:wght@400&family=Roboto+Mono:wght@200;400;500;700&family=Roboto+Slab:wght@300&display=swap"
        }
      />
      {config && <link rel="icon" href={`/${config.id}/favicons/favicon.ico`} />}
    </>
  );
}
