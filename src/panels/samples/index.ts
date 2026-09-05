/** A11's original Astromaterial Samples tab, backed by the preserved local
 * geoData, geoCompendiumData, paperData and geosampledetails index files. */
import "../../styles/panels/samples.css";
import { loadCsv } from "../../data/csvLoader.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import {
  parseSampleCollections,
  parseSamplePhotos,
  parseSamplePublications,
  sampleCatalogLinks,
  samplePhotoUrls,
  type SampleCollection,
} from "./data.js";

export interface SamplesPanelOptions {
  onSeek: (seconds: number) => void;
  assetRoot?: string;
}
export interface SamplesPanel {
  setVisible(visible: boolean): void;
  destroy(): void;
}
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(text: string, url: string): HTMLAnchorElement {
  const anchor = element("a", "", text);
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

export async function createSamplesPanel(
  host: HTMLElement,
  options: SamplesPanelOptions,
): Promise<SamplesPanel> {
  const root = `${(options.assetRoot ?? "/11/").replace(/\/+$/, "")}/`;
  const [collectionResult, catalogResult, paperResult] = await Promise.allSettled([
    loadCsv(`${root}indexes/geoData.csv`),
    loadCsv(`${root}indexes/geoCompendiumData.csv`),
    loadCsv(`${root}indexes/paperData.csv`),
  ]);
  if (collectionResult.status === "rejected")
    throw new Error("The sample collection index could not be loaded.");
  const collections = parseSampleCollections(collectionResult.value);
  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : [];
  const papers = parseSamplePublications(
    paperResult.status === "fulfilled" ? paperResult.value : [],
  );
  const abort = new AbortController();
  let destroyed = false;
  host.classList.add("samples-panel");
  host.hidden = true;

  function renderIndex(): void {
    host.replaceChildren();
    const heading = element("h2", "", "Apollo 11 Lunar Samples");
    const intro = element(
      "p",
      "",
      "Apollo 11 carried the first geologic samples from the Moon to Earth. The crew collected 22 kilograms of geologic material, including 50 rocks, samples of the fine-grained lunar regolith, and two core tubes that included material from up to 13 centimeters below the lunar surface. In addition, a solar wind collection experiment was deployed on the surface and returned by the crew. Two primary types of rocks, basalts and breccias, were found at the Apollo 11 landing site.",
    );
    const title = element("h3", "", "Jump to Sample Collection Moments");
    const explanation = element(
      "p",
      "",
      "Choose a container to return to its collection time and explore the samples inside. Sample numbers were assigned after the material returned to Earth.",
    );
    const list = element("div", "samples-panel__collections");
    for (const collection of collections) {
      const button = element("button", "samples-panel__collection");
      button.type = "button";
      button.append(
        element(
          "time",
          "",
          collection.seconds === null ? "Time unrecorded" : secondsToTimeStr(collection.seconds),
        ),
        element("strong", "", collection.name),
        element("span", "", collection.samples.join(", ")),
      );
      button.addEventListener("click", () => {
        if (collection.seconds !== null) options.onSeek(collection.seconds);
        renderCollection(collection);
      });
      list.append(button);
    }
    const curation = element("section", "samples-panel__curation");
    const image = element("img", "");
    image.src = `${root}img/ares2.jpg`;
    image.alt = "NASA lunar sample curation facility";
    image.loading = "lazy";
    const text = element(
      "p",
      "",
      "The Apollo lunar samples and their associated records are protected, preserved and processed by NASA's Astromaterials Research and Exploration Science Division at Johnson Space Center in Houston, Texas. The lunar sample facility preserves the collection while making samples available to approved scientists and educators.",
    );
    curation.append(
      element("h3", "", "Lunar Sample Curation"),
      image,
      text,
      link("NASA Astromaterials Research and Exploration Science", "https://ares.jsc.nasa.gov/"),
    );
    host.append(heading, intro, title, explanation, list, curation);
    host.scrollTop = 0;
  }

  async function loadPhotography(sample: string, gallery: HTMLElement): Promise<void> {
    gallery.textContent = "Loading sample photography…";
    try {
      const response = await fetch(`${root}indexes/geosampledetails/${sample}.csv`, {
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      const images = parseSamplePhotos(await response.text());
      if (destroyed) return;
      gallery.replaceChildren();
      if (!images.length) gallery.textContent = "No photography indexed for this sample.";
      for (const id of images) {
        const urls = samplePhotoUrls(id);
        const anchor = link("", urls.page);
        const img = element("img", "");
        img.src = urls.image;
        img.alt = `Sample ${sample}, photograph ${id}`;
        img.loading = "lazy";
        img.addEventListener("error", () => {
          img.hidden = true;
        });
        anchor.append(img, element("span", "", id));
        gallery.append(anchor);
      }
    } catch {
      if (!destroyed)
        gallery.textContent =
          "No photography indexed for this sample. NASA's curation record may include additional images.";
    }
  }

  function renderCollection(collection: SampleCollection): void {
    host.replaceChildren();
    const back = element("button", "samples-panel__back", "← All collection containers");
    back.type = "button";
    back.addEventListener("click", renderIndex);
    host.append(back, element("h2", "", collection.name));
    if (collection.seconds !== null) {
      const seconds = collection.seconds;
      const seek = element(
        "button",
        "samples-panel__seek",
        `Return to collection · ${secondsToTimeStr(seconds)}`,
      );
      seek.type = "button";
      seek.addEventListener("click", () => {
        options.onSeek(seconds);
      });
      host.append(seek);
    } else
      host.append(
        element(
          "p",
          "",
          "The collection time for this group was not recorded in the mission index.",
        ),
      );
    host.append(
      element(
        "p",
        "",
        "Expand a sample to see NASA photography, curation records and published research.",
      ),
    );
    for (const [index, sample] of collection.samples.entries()) {
      const card = element("details", "samples-panel__sample");
      card.append(element("summary", "", `Sample ${sample}`));
      const content = element("div", "samples-panel__sample-content");
      const links = element("nav", "samples-panel__links");
      links.setAttribute("aria-label", `Sample ${sample} records`);
      for (const item of sampleCatalogLinks(catalog, sample))
        links.append(link(item.label, item.url));
      const gallery = element("div", "samples-panel__gallery");
      content.append(links, element("h3", "", "Sample Photography"), gallery);
      const references = papers.filter((paper) => paper.samples.includes(sample));
      if (references.length) {
        const publications = element("details", "samples-panel__papers");
        publications.append(
          element("summary", "", `Published scientific papers (${String(references.length)})`),
        );
        const list = element("ol", "");
        for (const paper of references) {
          const item = element("li", "");
          item.append(
            link(`${paper.year} · ${paper.title}`, paper.url),
            element("p", "", `${paper.authors} · ${paper.journal}`),
          );
          list.append(item);
        }
        publications.append(list);
        content.append(publications);
      }
      card.append(content);
      let loaded = false;
      card.addEventListener("toggle", () => {
        if (card.open && !loaded) {
          loaded = true;
          void loadPhotography(sample, gallery);
        }
      });
      card.open = index === 0;
      host.append(card);
    }
    host.scrollTop = 0;
  }
  renderIndex();
  return {
    setVisible(visible) {
      if (!destroyed) host.hidden = !visible;
    },
    destroy() {
      destroyed = true;
      abort.abort();
      host.replaceChildren();
      host.classList.remove("samples-panel");
    },
  };
}
