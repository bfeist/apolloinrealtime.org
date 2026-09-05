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
    const panelTitle = element("h2", "samples-panel__title", "Astromaterial Sample Information");
    const heading = element("h3", "samples-panel__section-heading", "Apollo 11 Lunar Samples");
    const intro = element(
      "p",
      "",
      "Apollo 11 carried the first geologic samples from the Moon to Earth. The crew collected 22 kilograms of geologic material, including 50 rocks, samples of the fine-grained lunar regolith, and two core tubes that included material from up to 13 centimeters below the lunar surface. In addition to these samples, a solar wind collection experiment was deployed on the surface and returned by the crew. The rock samples contain no water and provide no evidence for living organisms at any time in the Moon's history. Two primary types of rocks, basalts and breccias, were found at the Apollo 11 landing site. The lunar samples collected by the Apollo 11 crew were deposited in bulk into sample containers for return to Earth.",
    );
    const title = element(
      "h3",
      "samples-panel__section-heading",
      "Jump to Sample Collection Moments:",
    );
    const explanation = element(
      "p",
      "",
      "The table below contains links to the moment each sample container was being filled, referencing the sample numbers that were assigned when the samples were returned to Earth.",
    );
    const frame = element("div", "samples-panel__collections");
    const table = element("table", "samples-panel__collections-table");
    const header = document.createElement("tr");
    for (const label of ["Time", "Container", "Sample Numbers"])
      header.append(element("th", "", label));
    table.append(header);
    for (const collection of collections.filter((item) => item.seconds !== null)) {
      const row = document.createElement("tr");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute(
        "aria-label",
        `View ${collection.name} samples at ${secondsToTimeStr(collection.seconds ?? 0)}`,
      );
      row.append(
        element("td", "", secondsToTimeStr(collection.seconds ?? 0)),
        element("td", "samples-panel__collection-link", collection.name),
        element("td", "", collection.samples.join(", ")),
      );
      const openCollection = () => {
        if (collection.seconds !== null) options.onSeek(collection.seconds);
        renderCollection(collection);
      };
      row.addEventListener("click", openCollection);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCollection();
        }
      });
      table.append(row);
    }
    frame.append(table);
    const curation = element("section", "samples-panel__curation");
    const image = element("img", "");
    image.src = `${root}img/ares2.jpg`;
    image.alt = "NASA lunar sample curation facility";
    image.loading = "lazy";
    const text = element(
      "p",
      "",
      "Geologic samples returned from the Moon by the six Apollo lunar surface exploration missions (1969-1972), along with associated data records, are physically protected, environmentally preserved, and scientifically processed by NASA's ",
    );
    text.append(
      link("Astromaterials Research and Exploration Science", "https://ares.jsc.nasa.gov/"),
      " Division in building 31N, a special building dedicated for that purpose, at Johnson Space Center in Houston, Texas. A total of 382 kilograms of lunar material, comprising 2200 individual specimens returned from the Moon, has been processed to meet scientific requirements into more than 110,000 individually cataloged samples.",
    );
    curation.append(
      element("h3", "samples-panel__section-heading", "Lunar Sample Curation"),
      image,
      text,
      element(
        "p",
        "",
        "Building 31N was constructed from 1977 to 1979 and opened in 1979 to provide for permanent storage of the lunar sample collection in a physically secure and non-contaminating environment. The purpose of the facility is to maintain in pristine condition the lunar samples that comprise a priceless national and scientific resource while making the samples available to approved scientists and educators.",
      ),
      element(
        "p",
        "",
        "The study of samples from the Moon continues to yield useful information about the early history of the Moon, the Earth, and the Solar System. Computer models indicate that the Moon could have been formed from the debris resulting from the Earth being struck a glancing blow by a planetary body about the size of Mars. The chemical composition of the Moon, derived from studies of lunar rocks, is compatible with this theory of the origin of the Moon. We have learned that a crust formed on the Moon ~4.4 billion years ago. This crust formation, the intense meteorite bombardment occurring afterward, and subsequent lava outpourings are recorded in the rocks. Radiation spewed out by the Sun since the formation of the Moon's crust, was trapped in the lunar soil as a permanent record of solar activity throughout this time.",
      ),
    );
    host.append(panelTitle, heading, intro, title, explanation, frame, curation);
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
