import { Link } from "react-router-dom";
import { PageHead } from "../components/layout/PageHead.js";
export function LandingPage() {
  return (
    <>
      <PageHead />
      <main id="app">
        <header className="landing-header">
          <div className="landing-header__content">
            <img
              className="landing-header__patch"
              src="/landing/apollo_program_patch_200.png"
              width="112"
              height="112"
              alt="Apollo program insignia"
            />
            <div className="landing-header__copy">
              <h1 className="landing-header__heading">
                APOLLO <span>IN REAL TIME</span>
              </h1>
              <p className="landing-header__introduction">
                A real-time journey through the Apollo missions.
              </p>
              <p className="landing-header__material">
                This website consists entirely of historical mission material
              </p>
              <p className="landing-header__selection" id="mission-selection">
                Select an available mission:
              </p>
            </div>
          </div>
        </header>
        <section className="landing-missions" aria-labelledby="mission-selection">
          <div className="landing-missions__grid">
            <Link
              className="landing-mission"
              to="/11/"
              aria-labelledby="apollo-11-title apollo-11-description"
            >
              <img
                src="/landing/Apollo11.png"
                width="295"
                height="389"
                alt="Apollo 11 insignia above a photograph on the lunar surface"
              />
              <h2 id="apollo-11-title">APOLLO 11</h2>
              <p id="apollo-11-description">The First Landing on the Moon</p>
              <p>Launch: July 16, 1969</p>
            </Link>
            <Link
              className="landing-mission"
              to="/13/"
              aria-labelledby="apollo-13-title apollo-13-description"
            >
              <img
                src="/landing/Apollo13.png"
                width="295"
                height="389"
                alt="Apollo 13 insignia above a photograph of the Moon and spacecraft"
              />
              <h2 id="apollo-13-title">APOLLO 13</h2>
              <p id="apollo-13-description">The Third Lunar Landing Attempt</p>
              <p>Launch: April 11, 1970</p>
            </Link>
            <Link
              className="landing-mission"
              to="/17/"
              aria-labelledby="apollo-17-title apollo-17-description"
            >
              <img
                src="/landing/Apollo17.png"
                width="295"
                height="389"
                alt="Apollo 17 insignia above a photograph on the lunar surface"
              />
              <h2 id="apollo-17-title">APOLLO 17</h2>
              <p id="apollo-17-description">The Last Landing on the Moon</p>
              <p>Launch: Dec 7, 1972</p>
            </Link>
          </div>
          <p className="landing-forum">
            Join the Apollo in Real Time Forum:
            <a href="https://forum.apolloinrealtime.org">forum.apolloinrealtime.org</a>
          </p>
        </section>
      </main>
    </>
  );
}
