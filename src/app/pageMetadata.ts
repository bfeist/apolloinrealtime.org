/** Shared by Vite's HTML entry and client-side route changes. */
export interface PageHeadTag {
  tag: "title" | "meta" | "link";
  attrs: Record<string, string>;
  children?: string;
}

const landingMeta: MissionMeta = {
  title: "Apollo in Real Time",
  description:
    "A real-time interactive journey through the Apollo missions. Relive every moment as it occurred.",
  ogImage: "https://apolloinrealtime.org/img/screenshot.jpg",
  ogUrl: "https://apolloinrealtime.org/",
  fbAppId: "2942541712463314",
};

export function pageHeadTags(config?: MissionConfig): PageHeadTag[] {
  const meta = config?.meta ?? landingMeta;
  const tags: PageHeadTag[] = [
    { tag: "title", attrs: {}, children: meta.title },
    { tag: "meta", attrs: { name: "description", content: meta.description } },
    { tag: "meta", attrs: { name: "theme-color", content: "#131313" } },
    // Apollo 17 retains its legacy document-title spelling but a standard OG title.
    {
      tag: "meta",
      attrs: { property: "og:title", content: config ? `${config.name} in Real Time` : meta.title },
    },
    { tag: "meta", attrs: { property: "og:type", content: "website" } },
    { tag: "meta", attrs: { property: "og:image", content: meta.ogImage } },
    { tag: "meta", attrs: { property: "og:url", content: meta.ogUrl } },
    { tag: "meta", attrs: { property: "og:description", content: meta.description } },
    { tag: "meta", attrs: { property: "og:site_name", content: "Apollo in Real Time" } },
    { tag: "meta", attrs: { property: "fb:app_id", content: meta.fbAppId } },
    { tag: "link", attrs: { rel: "canonical", href: meta.ogUrl } },
  ];
  if (config) {
    tags.push({
      tag: "link",
      attrs: {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: `/${config.id}/favicons/favicon-32x32.png`,
      },
    });
  }
  return tags.map((tag) => ({ ...tag, attrs: { ...tag.attrs, "data-page-head": "" } }));
}
