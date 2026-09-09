import { useEffect, useRef, type ReactNode } from "react";
import { sampleCatalogLinks, samplePhotoUrls, type SamplePublication } from "../samples/data.js";
import { useSamplePhotos } from "../samples/useSamplesData.js";
import type { GeoSampleBag, GeoSampleDetail } from "./data.js";
import { useGeoSampleDetail, useGeoSampleIndex } from "./useGeoSampleData.js";
import styles from "./GeoSampleOverlay.module.css";

function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function SampleInfoTable({ detail }: { detail: GeoSampleDetail }) {
  const specimen = [detail.sampleType, detail.sampleSubtype].filter(Boolean).join(" - ");
  const pristinity = [detail.pristinity, detail.pristinityDate ? `(${detail.pristinityDate})` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <table className={styles.sampleInfoTable} data-testid="geosample-details">
      <tbody>
        <tr>
          <td>Specimen Type</td>
          <td>{specimen}</td>
          <td>Return Container</td>
          <td>{detail.bagNumber}</td>
        </tr>
        <tr>
          <td>Lunar Station</td>
          <td>{detail.station}</td>
          <td>Weight</td>
          <td>{detail.originalWeight}</td>
        </tr>
        <tr>
          <td>Landmark</td>
          <td>{detail.landmark}</td>
          <td>Pristinity</td>
          <td>{pristinity}</td>
        </tr>
        <tr>
          <td>Description</td>
          <td colSpan={3}>{detail.description}</td>
        </tr>
      </tbody>
    </table>
  );
}

function SampleCard({
  config,
  sample,
  catalog,
  papers,
}: {
  config: MissionConfig;
  sample: string;
  catalog: readonly string[][];
  papers: readonly SamplePublication[];
}) {
  const details = useGeoSampleDetail(sample);
  const photos = useSamplePhotos(config, sample, true);
  const links = sampleCatalogLinks(catalog, sample);
  const references = papers.filter((paper) => paper.samples.includes(sample));
  return (
    <section className={styles.sampleFrame} data-testid={`geosample-${sample}`}>
      <h3 className={styles.sampleTitle}>Sample {sample}</h3>
      <div className={styles.sampleSubtitle}>Sample Information</div>
      <table className={styles.sampleInfoTable}>
        <tbody>
          <tr>
            <td>External links</td>
            <td colSpan={3}>
              {links.map((link, index) => (
                <span key={link.url}>
                  {index > 0 && " - "}
                  <ExternalLink url={link.url}>
                    {index === 0 ? "Lunar Sample Curation Info" : link.label}
                  </ExternalLink>
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      {details.data ? (
        <SampleInfoTable detail={details.data} />
      ) : details.isError ? (
        <p className={styles.dataMessage}>Sample information is currently unavailable.</p>
      ) : null}
      {photos.data && photos.data.length > 0 && (
        <div className={styles.geoImages}>
          <div className={styles.sampleImagesSubtitle}>Sample Photography</div>
          <ul className={styles.photoList}>
            {photos.data.map((id) => {
              const urls = samplePhotoUrls(id);
              return (
                <li key={id}>
                  <ExternalLink url={urls.page}>
                    <img
                      src={urls.image}
                      alt={`Sample ${sample}, photograph ${id}`}
                      loading="lazy"
                    />
                  </ExternalLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {references.length > 0 && (
        <div className={styles.geoPapers}>
          <div className={styles.geoPapersTitle}>
            Published scientific papers that reference <span>Sample {sample}</span>
          </div>
          <table className={styles.geoPapersTable}>
            <thead>
              <tr>
                <th>Year</th>
                <th>Title</th>
                <th>Authors</th>
                <th>Journal</th>
              </tr>
            </thead>
            <tbody>
              {references.map((paper, index) => (
                <tr key={`${paper.url}:${String(index)}`}>
                  {[paper.year, paper.title, paper.authors, paper.journal].map((value, cell) => (
                    <td key={cell}>
                      <ExternalLink url={paper.url}>{value}</ExternalLink>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function GeoSampleOverlay({
  config,
  bag,
  onClose,
}: {
  config: MissionConfig;
  bag: GeoSampleBag;
  onClose: () => void;
}) {
  const index = useGeoSampleIndex(config);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  return (
    <section
      className={styles.overlay}
      role="dialog"
      aria-labelledby="geosample-title"
      data-testid="geosample-overlay"
    >
      <header className={styles.header}>
        <h2 id="geosample-title">Geology Sample Information - Bag: {bag.bagNumber}</h2>
        <button
          ref={closeRef}
          className={styles.closeButton}
          type="button"
          aria-label="Close geology sample information"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <hr />
      <div className={styles.scrollArea}>
        {index.isError ? (
          <p className={styles.dataMessage}>Geology sample information could not be loaded.</p>
        ) : !index.data ? (
          <p className={styles.dataMessage}>Loading sample information...</p>
        ) : (
          bag.samples.map((sample) => (
            <SampleCard
              key={sample}
              config={config}
              sample={sample}
              catalog={index.data.catalog}
              papers={index.data.papers}
            />
          ))
        )}
      </div>
    </section>
  );
}
