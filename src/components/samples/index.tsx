/** Apollo 11's collection moments, NASA photographs, and research references. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { secondsToTimeStr } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import {
  sampleCatalogLinks,
  samplePhotoUrls,
  type SampleCollection,
  type SamplePublication,
} from "./data.js";
import { useSamplePhotos, useSamplesData } from "./useSamplesData.js";
import styles from "./SamplesPanel.module.css";

function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function SamplePhoto({ sample, id }: { sample: string; id: string }) {
  const [failed, setFailed] = useState(false);
  const urls = samplePhotoUrls(id);
  return (
    <ExternalLink url={urls.page}>
      <img
        src={urls.image}
        alt={`Sample ${sample}, photograph ${id}`}
        loading="lazy"
        hidden={failed}
        onError={() => {
          setFailed(true);
        }}
      />
      <span>{id}</span>
    </ExternalLink>
  );
}

function SampleCard({
  config,
  sample,
  initiallyOpen,
  catalog,
  papers,
}: {
  config: MissionConfig;
  sample: string;
  initiallyOpen: boolean;
  catalog: readonly string[][];
  papers: readonly SamplePublication[];
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const photos = useSamplePhotos(config, sample, open);
  const references = papers.filter((paper) => paper.samples.includes(sample));
  return (
    <details
      className={styles.samplesPanelSample}
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>Sample {sample}</summary>
      <div className={styles.samplesPanelSampleContent}>
        <nav className={styles.samplesPanelLinks} aria-label={`Sample ${sample} records`}>
          {sampleCatalogLinks(catalog, sample).map((item) => (
            <ExternalLink key={item.url} url={item.url}>
              {item.label}
            </ExternalLink>
          ))}
        </nav>
        <h3>Sample Photography</h3>
        <div className={styles.samplesPanelGallery}>
          {photos.isError
            ? "No photography indexed for this sample. NASA's curation record may include additional images."
            : photos.isPending
              ? "Loading sample photography…"
              : photos.data.length
                ? photos.data.map((id) => <SamplePhoto key={id} id={id} sample={sample} />)
                : "No photography indexed for this sample."}
        </div>
        {references.length > 0 && (
          <details className={styles.samplesPanelPapers}>
            <summary>Published scientific papers ({references.length})</summary>
            <ol>
              {references.map((paper, index) => (
                <li key={`${paper.url}:${String(index)}`}>
                  <ExternalLink url={paper.url}>
                    {paper.year} · {paper.title}
                  </ExternalLink>
                  <p>
                    {paper.authors} · {paper.journal}
                  </p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </details>
  );
}

export function SamplesPanel({ config }: { config: MissionConfig }) {
  const query = useSamplesData(config);
  const seek = useMissionStore((state) => state.seek);
  const [collection, setCollection] = useState<SampleCollection | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rootRef.current) rootRef.current.scrollTop = 0;
  }, [collection]);
  const openCollection = (item: SampleCollection) => {
    if (item.seconds !== null) seek(item.seconds);
    setCollection(item);
  };
  return (
    <div className={styles.samplesPanel} ref={rootRef}>
      {query.isError ? (
        <p>The sample collection index could not be loaded.</p>
      ) : !query.data ? (
        <p>Loading...</p>
      ) : collection ? (
        <>
          <button
            className={styles.samplesPanelBack}
            type="button"
            onClick={() => {
              setCollection(null);
            }}
          >
            ← All collection containers
          </button>
          <h2>{collection.name}</h2>
          {collection.seconds !== null ? (
            <button
              className={styles.samplesPanelSeek}
              type="button"
              onClick={() => {
                if (collection.seconds !== null) seek(collection.seconds);
              }}
            >
              Return to collection · {secondsToTimeStr(collection.seconds)}
            </button>
          ) : (
            <p>The collection time for this group was not recorded in the mission index.</p>
          )}
          <p>Expand a sample to see NASA photography, curation records and published research.</p>
          {collection.samples.map((sample, index) => (
            <SampleCard
              key={`${collection.name}:${sample}`}
              config={config}
              sample={sample}
              initiallyOpen={index === 0}
              catalog={query.data.catalog}
              papers={query.data.papers}
            />
          ))}
        </>
      ) : (
        <>
          <h2 className={styles.samplesPanelTitle}>Astromaterial Sample Information</h2>
          <h3 className={styles.samplesPanelSectionHeading}>Apollo 11 Lunar Samples</h3>
          <p>
            Apollo 11 carried the first geologic samples from the Moon to Earth. The crew collected
            22 kilograms of geologic material, including 50 rocks, samples of the fine-grained lunar
            regolith, and two core tubes that included material from up to 13 centimeters below the
            lunar surface. In addition to these samples, a solar wind collection experiment was
            deployed on the surface and returned by the crew. The rock samples contain no water and
            provide no evidence for living organisms at any time in the Moon's history. Two primary
            types of rocks, basalts and breccias, were found at the Apollo 11 landing site. The
            lunar samples collected by the Apollo 11 crew were deposited in bulk into sample
            containers for return to Earth.
          </p>
          <h3 className={styles.samplesPanelSectionHeading}>Jump to Sample Collection Moments:</h3>
          <p>
            The table below contains links to the moment each sample container was being filled,
            referencing the sample numbers that were assigned when the samples were returned to
            Earth.
          </p>
          <div className={styles.samplesPanelCollections}>
            <table
              className={styles.samplesPanelCollectionsTable}
              data-testid="samples-collections"
            >
              <tbody>
                <tr>
                  {["Time", "Container", "Sample Numbers"].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
                {query.data.collections
                  .filter((item) => item.seconds !== null)
                  .map((item) => (
                    <tr
                      key={item.name}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${item.name} samples at ${secondsToTimeStr(item.seconds ?? 0)}`}
                      onClick={() => {
                        openCollection(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCollection(item);
                        }
                      }}
                    >
                      <td>{secondsToTimeStr(item.seconds ?? 0)}</td>
                      <td className={styles.samplesPanelCollectionLink}>{item.name}</td>
                      <td>{item.samples.join(", ")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <section className={styles.samplesPanelCuration}>
            <h3 className={styles.samplesPanelSectionHeading}>Lunar Sample Curation</h3>
            <img
              src={`/${config.id}/img/ares2.jpg`}
              alt="NASA lunar sample curation facility"
              loading="lazy"
            />
            <p>
              Geologic samples returned from the Moon by the six Apollo lunar surface exploration
              missions (1969-1972), along with associated data records, are physically protected,
              environmentally preserved, and scientifically processed by NASA's{" "}
              <ExternalLink url="https://ares.jsc.nasa.gov/">
                Astromaterials Research and Exploration Science
              </ExternalLink>{" "}
              Division in building 31N, a special building dedicated for that purpose, at Johnson
              Space Center in Houston, Texas. A total of 382 kilograms of lunar material, comprising
              2200 individual specimens returned from the Moon, has been processed to meet
              scientific requirements into more than 110,000 individually cataloged samples.
            </p>
            <p>
              Building 31N was constructed from 1977 to 1979 and opened in 1979 to provide for
              permanent storage of the lunar sample collection in a physically secure and
              non-contaminating environment. The purpose of the facility is to maintain in pristine
              condition the lunar samples that comprise a priceless national and scientific resource
              while making the samples available to approved scientists and educators.
            </p>
            <p>
              The study of samples from the Moon continues to yield useful information about the
              early history of the Moon, the Earth, and the Solar System. Computer models indicate
              that the Moon could have been formed from the debris resulting from the Earth being
              struck a glancing blow by a planetary body about the size of Mars. The chemical
              composition of the Moon, derived from studies of lunar rocks, is compatible with this
              theory of the origin of the Moon. We have learned that a crust formed on the Moon ~4.4
              billion years ago. This crust formation, the intense meteorite bombardment occurring
              afterward, and subsequent lava outpourings are recorded in the rocks. Radiation spewed
              out by the Sun since the formation of the Moon's crust, was trapped in the lunar soil
              as a permanent record of solar activity throughout this time.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
