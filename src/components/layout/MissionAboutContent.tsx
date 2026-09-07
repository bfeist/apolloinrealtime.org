import { A17_AWWWARDS_NOMINEE, A17_WEBBY_AWARD } from "../../app/a17AwardImages.js";
import styles from "../../styles/base.module.css";

/** Historical help and credits retain each mission's original wording and markup. */
export function MissionAboutContent({ config }: { config: MissionConfig }) {
  switch (config.id) {
    case "11":
      return <About11 />;
    case "13":
      return <About13 />;
    case "17":
      return (
        <>
          <MissionAboutHeaderHelp />
          <About17 />
        </>
      );
    default:
      return null;
  }
}

function About11() {
  return (
    <>
      <div className={styles.missionAboutIntro}>
        <h2>A real-time journey through the first landing on the Moon</h2>
        <h3>Introduction</h3>
        <p>
          This website replays the Apollo 11 mission as it happened. It consists entirely of
          historical material, all timed to Ground Elapsed Time--the master mission clock. Footage
          of Mission Control, film shot by the astronauts, and television broadcasts transmitted
          from space and the surface of the Moon, have been painstakingly placed to the very moments
          they were shot during the mission, as has every photograph taken, and every word spoken.
        </p>
        <h3>Interface</h3>
        <p>
          Upon starting the application, select whether to begin one minute before launch, or click
          &quot;Now&quot; to drop in to the mission using today's date and time, to-the-second
          during the anniversary.
        </p>
        <p>
          Navigate to any moment of the mission using the time navigator at the top of the screen.
          The top bar is the entire mission with two bars below it providing magnification.
          Selecting transcript items, photos, commentary items, or guided tour moments, also jumps
          the mission time to the moment they occurred.
        </p>
        <p>
          Main mission audio consists of space-to-ground (left ear), capcom loop (right ear), and
          on-board recorder (center, when available). Selecting a Mission Control audio channel
          mutes the main audio, opens the Mission Control audio panel, and plays the
          &quot;live&quot; audio of that Mission Control position. Change channels by selecting the
          seats in mission control. Closing the Mission Control audio panel will unmute the main
          audio and continue mission playback.
        </p>
        <p>
          These 50 channels of Mission Control audio have only recently been digitized and restored,
          and are made publicly available here for the first time. They total over 11,000 hours in
          length.
        </p>
        <p>
          Please contact{" "}
          <a href="http://benfeist.com" target="_blank" rel="noopener">
            Ben Feist
          </a>{" "}
          for any inquiries.
        </p>
        <img src="/11/img/help_callouts.jpg" alt="Apollo 11 interface callouts" />
        <img src="/11/img/navigator_key.jpg" alt="Apollo 11 navigator key" />
        <blockquote>
          &quot;I think we're going to the moon because it's in the nature of the human being to
          face challenges. It's by the nature of his deep inner soul... we're required to do these
          things just as salmon swim upstream.&quot;
          <footer>
            — Neil Armstrong
            <br />
            Commander, Apollo 11
          </footer>
        </blockquote>
        <blockquote>
          &quot;Space is not just going up and coming back down again. Space is getting into orbit
          and being there, living there, establishing a presence, a permanence.&quot;
          <footer>
            — Buzz Aldrin
            <br />
            Lunar Module Pilot, Apollo 11
          </footer>
        </blockquote>
        <blockquote>
          &quot;I knew I was alone in a way that no earthling has ever been before.&quot;
          <footer>
            — Michael Collins
            <br />
            Command Module Pilot, Apollo 11
          </footer>
        </blockquote>
      </div>
      <Credits11 />
    </>
  );
}

function Credits11() {
  return (
    <section className={styles.missionAboutCredits}>
      <h3>Credits</h3>
      <p>
        <strong>Ben Feist</strong> Concept, research, mission data restoration, audio restoration,
        video, software architecture and programming. Follow{" "}
        <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">
          @BenFeist
        </a>{" "}
        for updates.
        <br />
        <br />
        <strong>Stephen Slater</strong> Archive Producer, historical audio/footage synchronization
        <br />
        <br />
        <strong>Chris Bennett</strong> Visual design, interface styling and programming
        <br />
        <strong>David Charney</strong> Visual design
        <br />
        <strong>Arnfinn Holderer</strong> Audio restoration programming
        <br />
        <br />
        <strong>Robin Wheeler</strong> Photography timing, transcript corrections
      </p>
      <h3>Thanks</h3>
      <p>
        <strong>Todd Miller</strong> Director,{" "}
        <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">
          Apollo 11
        </a>{" "}
        film
        <br />
        <strong>Tom Petersen</strong> Producer,{" "}
        <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">
          Apollo 11
        </a>{" "}
        film
        <br />
        <strong>Dr. John Hansen and the National Science Foundation</strong> 30-track Mission
        Control{" "}
        <a
          href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes"
          target="_blank"
          rel="noopener"
        >
          audio digitization
        </a>
        . More info at{" "}
        <a href="http://exploreapollo.org" target="_blank" rel="noopener">
          exploreapollo.org
        </a>
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>Lunar and Planetary Institute</span>
        <br />
        <strong>Jamie Shumbera</strong> Operations Manager
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Headquarters</span>
        <br />
        <strong>Dr. Bill Barry</strong> Chief Historian, NASA HQ
        <br />
        <strong>Dr. Jacob Bleacher</strong> Chief Exploration Scientist, NASA HQ
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Johnson Space Center</span>
        <br />
        <strong>Dr. Cindy Evans</strong> Division Chief, Astromaterials Research and Exploration
        Science (ARES) Division, NASA JSC
        <br />
        <strong>Dan Garrison</strong> Jacobs Technology, NASA JSC
        <br />
        <strong>Dr. Ryan Zeigler</strong> Manager, Apollo Curator, ARES, NASA JSC
        <br />
        <strong>Dr. Paul Niles</strong> Assistant Chief Scientist, ARES NASA JSC
        <br />
        <strong>Sandra Tetley</strong> Real Property Officer, Historic Preservation Officer, NASA
        JSC
        <br />
        <strong>Greg Wiseman</strong> 30-track Mission Control{" "}
        <a
          href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes"
          target="_blank"
          rel="noopener"
        >
          audio digitization
        </a>
        , NASA JSC
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Goddard Space Flight Center</span>
        <br />
        <strong>Dr. Noah Petro</strong> Project Scientist, Lunar Reconnaissance Orbiter. Planetary
        Geology, Geochemistry and Geophysics Lab, NASA Goddard
        <br />
        <strong>David Woods</strong> Author,{" "}
        <a href="http://www.hafttm.com/" target="_blank" rel="noopener">
          How Apollo Flew to the Moon
        </a>
        <br />
        <strong>Kipp Teague</strong>{" "}
        <a
          href="https://www.flickr.com/photos/projectapolloarchive/albums"
          target="_blank"
          rel="noopener"
        >
          Apollo mission photography
        </a>
        <br />
        <strong>Paul Vanezis</strong> EVA footage
        <br />
        <strong>NASA Apollo Flight Journal</strong>
        <br />
        <strong>NASA Apollo Lunar Surface Journal</strong>
        <br />
        <strong>Internet Archive</strong>
        <br />
        <strong>The crew of Apollo 11</strong>
        <br />
        <strong>The men and women of Mission Control</strong>
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>Beta Testers</span>
        <br />
        <strong>Mike Dinn</strong>
        <br />
        <strong>Jacqueline Poole</strong>
        <br />
        <strong>Todd Green</strong>
        <br />
        <strong>Ian House</strong>
        <br />
        <strong>Joey Schwartz</strong>
        <br />
        <strong>David Charney</strong>
        <br />
        <strong>Sammy Goldberg</strong>
        <br />
        <strong>Robin Wheeler</strong>
        <br />
        <strong>Joe Davenport</strong>
        <br />
        <strong>Linden Sims</strong>
        <br />
        <strong>Suzanne Molina</strong>
        <br />
        <strong>Kevin Spencer</strong>
        <br />
        <br />
        <span className={styles.missionAboutLegal}>
          THIS WEBSITE IS THE COPYRIGHT OF BEN FEIST ©2019.
          <br />
          <br />
          THE ARCHIVE MATERIAL ON THIS WEBSITE COMPRISES NASA AUDIO RESTORED BY BEN FEIST AND NASA
          SYNCHRONISED AUDIO/VISUAL MATERIAL PROVIDED BY STEPHEN SLATER.
          <br />
          <br />
          ANY SYNCHRONISED FOOTAGE MAY ONLY BE REPRODUCED AND UTILISED WITH THE PRIOR WRITTEN
          PERMISSION OF STEPHEN SLATER. ALL RIGHTS IN THE SYNCHRONISED FOOTAGE ARE EXPRESSLY
          RESERVED TO STEPHEN SLATER.
        </span>
      </p>
    </section>
  );
}

function About13() {
  return (
    <>
      <div className={styles.missionAboutIntro}>
        <h2>A real-time journey through the Apollo 13 mission</h2>
        <h3>Introduction</h3>
        <p>
          This website replays the Apollo 13 mission as it happened. It consists entirely of
          historical material, all timed to Ground Elapsed Time--the master mission clock. Footage
          of Mission Control, film shot by the astronauts, and television broadcasts transmitted
          from space have been painstakingly placed to the very moments they were shot during the
          mission, as has every photograph taken, and every word spoken.
        </p>
        <p>
          This project includes newly digitized and restored mission control audio. The last tapes
          of these recordings were discovered in the National Archives fall of 2019 and were
          digitized in February, 2020 and contain the time surrounding the onboard explosion. These
          recordings haven't been heard since the accident investigation in 1970.
        </p>
        <h3>Interface</h3>
        <p>
          Upon starting the application, select whether to begin one minute before launch, or click
          &quot;Now&quot; to drop in to the mission using today's date and time.
        </p>
        <p>
          Navigate to any moment of the mission using the time navigator at the top of the screen.
          The top bar is the entire mission with two bars below it providing magnification. Clicking
          transcript items, photos, commentary items, or guided tour moments also jumps the mission
          time to those events.
        </p>
        <p>
          Main mission audio consists of space-to-ground (left ear), capcom loop (right ear), and
          on-board recorder (center, when available). Selecting a Mission Control audio channel
          mutes the main audio, opens the Mission Control audio panel, and plays the
          &quot;live&quot; audio of each selected Mission Control position. Change channels by
          selecting the seats in Mission Control. Closing the Mission Control audio panel will
          unmute the main audio and continue mission playback.
        </p>
        <p>
          These 50 channels of Mission Control audio spanning the entire mission have only recently
          been digitized and restored, and are made publicly available here for the first time. They
          total over 7,200 hours in length.
        </p>
        <p>
          Please contact{" "}
          <a href="http://benfeist.com" target="_blank" rel="noopener">
            Ben Feist
          </a>{" "}
          for any inquiries.
        </p>
        <img src="/13/img/help_callouts.jpg" alt="Apollo 13 interface callouts" />
        <img src="/13/img/navigator_key.jpg" alt="Apollo 13 navigator key" />
        <blockquote>
          &quot;I could put my thumb up to a window and completely hide the Earth. I thought,
          'Everything I've ever known is behind my thumb.'&quot;
          <footer>
            — Jim Lovell
            <br />
            Commander, Apollo 13
          </footer>
        </blockquote>
        <blockquote>
          &quot;My biggest emotion on Apollo 13 after the oxygen tank explosion was disappointment
          that we had lost the landing.&quot;
          <footer>
            — Fred Haise
            <br />
            Lunar Module Pilot, Apollo 13
          </footer>
        </blockquote>
        <blockquote>
          &quot;Okay, Houston, we've had a problem here.&quot;
          <footer>
            — Jack Swigert
            <br />
            Command Module Pilot, Apollo 13
          </footer>
        </blockquote>
      </div>
      <Credits13 />
    </>
  );
}

function Credits13() {
  return (
    <section className={styles.missionAboutCredits}>
      <h3>Credits</h3>
      <p>
        <strong>Ben Feist</strong> Concept, research, mission data restoration, audio restoration,
        video editing, software architecture and programming. Follow{" "}
        <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">
          @BenFeist
        </a>{" "}
        for updates.
        <br />
        <br />
        <strong>Stephen Slater</strong> Archive research and production, historical audio/film
        synchronization
        <br />
        <strong>David Charney</strong> Visual design, 3D modeling
        <br />
        <strong>Jeremy Cooper</strong> Audio restoration programming
        <br />
        <strong>Johannes Kemppanen</strong> Transcript corrections, additional historical research{" "}
        <a href="https://history.nasa.gov/afj/ap13fj/index.html" target="_blank" rel="noopener">
          Editor of the Apollo 13 Flight Journal
        </a>
        <br />
        <strong>Robin Wheeler</strong> Photography timing, transcript corrections{" "}
        <a href="https://history.nasa.gov/afj/ap10fj" target="_blank" rel="noopener">
          Editor of the Apollo 10 Flight Journal
        </a>
        <br />
        <strong>Greg Wiseman</strong> 30-track Mission Control{" "}
        <a
          href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes"
          target="_blank"
          rel="noopener"
        >
          audio digitization
        </a>
        , NASA JSC
        <br />
        <strong>Ernie Wright</strong> Lunar LRO Animations{" "}
        <a href="https://svs.gsfc.nasa.gov/" target="_blank" rel="noopener">
          Scientific Visualization Studio
        </a>
        , NASA Goddard
        <br />
        <strong>Issa Tseng</strong> Flight Director loop audio transcription{" "}
        <a href="http://apollo13realtime.org/" target="_blank" rel="noopener">
          apollo13realtime.org
        </a>
        <br />
        <strong>Chris Bennett</strong> Visual design, interface styling and programming
      </p>
      <h3>Thanks</h3>
      <p>
        <strong>Dan Rooney</strong> Supervisory Archivist, Special Media Archives Services Division,
        National Archives
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Headquarters</span>
        <br />
        <strong>Dr. Bill Barry</strong> Chief Historian, NASA HQ
        <br />
        <strong>Dr. Jacob Bleacher</strong> Chief Exploration Scientist, NASA HQ
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Johnson Space Center</span>
        <br />
        <strong>Sandra Tetley</strong> Real Property Officer, Historic Preservation Officer, NASA
        JSC
        <br />
        <strong>John Stoll</strong> Public Affairs Audio Control Room, NASA JSC
        <br />
        <strong>Dan Garrison</strong> Jacobs Technology, NASA JSC
        <br />
        <strong>Dr. Ryan Zeigler</strong> Manager, Apollo Curator, ARES, NASA JSC
        <br />
        <strong>Dr. Paul Niles</strong> Assistant Chief Scientist, ARES NASA JSC
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>NASA Goddard Space Flight Center</span>
        <br />
        <strong>Dr. Noah Petro</strong> Project Scientist, Lunar Reconnaissance Orbiter. Planetary
        Geology, Geophysics, and Geochemistry Lab, NASA GSFC
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>
          University of Texas – Dallas, Center for Robust Speech Systems (CRSS-UTDallas)
        </span>
        <br />
        <strong>
          Special thanks to the research team at CRSS-UTDallas under the leadership of Dr. John
          Hansen
        </strong>{" "}
        for their work in creating the Fearless Steps APOLLO Community Resource, and National
        Science Foundation (NSF) CCRI funded project, resulting in the recovery of all Apollo
        mission audio, and full speaker/speech diarization of all 150,000hrs of communications.
        Details found at the:{" "}
        <a href="http://exploreapollo.org" target="_blank" rel="noopener">
          CRSS-UTDallas Explore Apollo website
        </a>
        , and NASA Podcast{" "}
        <a
          href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes"
          target="_blank"
          rel="noopener"
        >
          “Heroes Behind the Heroes” Audio Digitizing Recovery
        </a>
        .<br />
        <strong>Todd Miller</strong> Director,{" "}
        <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">
          Apollo 11
        </a>{" "}
        film
        <br />
        <strong>Tom Petersen</strong> Producer,{" "}
        <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">
          Apollo 11
        </a>{" "}
        film
        <br />
        <br />
        <span className={styles.missionAboutSubheading}>Lunar and Planetary Institute</span>
        <br />
        <strong>Jamie Shumbera</strong> Operations Manager
        <br />
        <strong>David Woods</strong> Author,{" "}
        <a href="http://www.hafttm.com/" target="_blank" rel="noopener">
          How Apollo Flew to the Moon
        </a>
        <br />
        <strong>NASA Apollo Flight Journal</strong>
        <br />
        <strong>NASA Apollo Lunar Surface Journal</strong>
        <br />
        <strong>Internet Archive</strong>
        <br />
        <strong>The crew of Apollo 13</strong>
        <br />
        <strong>The men and women of Mission Control</strong>
        <br />
        <br />
        <span className={styles.missionAboutLegal}>
          THIS WEBSITE IS THE COPYRIGHT OF BEN FEIST ©2020.
          <br />
          <br />
          THE ARCHIVE MATERIAL ON THIS WEBSITE COMPRISES NASA AUDIO RESTORED BY BEN FEIST AND NASA
          SYNCHRONISED AUDIO/VISUAL MATERIAL PROVIDED BY STEPHEN SLATER.
          <br />
          <br />
          ANY SYNCHRONISED FOOTAGE MAY ONLY BE REPRODUCED AND UTILISED WITH THE PRIOR WRITTEN
          PERMISSION OF STEPHEN SLATER. ALL RIGHTS IN THE SYNCHRONISED FOOTAGE ARE EXPRESSLY
          RESERVED TO STEPHEN SLATER.
        </span>
      </p>
    </section>
  );
}

function About17() {
  return (
    <>
      <div className={styles.missionAboutIntro}>
        <h2>A real-time interactive journey through the last landing on the Moon.</h2>
        <blockquote>
          &quot;When I left the Moon and started up the ladder, I was really at a loss. I didn't
          want to leave and I looked down at my last footsteps and realised I wasn't coming this way
          again. Looking back over my shoulder at the Earth had a particular significance to me – it
          was alive, it was moving, with purpose and beauty through space and time. In those short
          few minutes I wanted to figure out what was the meaning of us – everyone alive in the
          world today…I wanted to press the freeze button, stop time to give myself a chance to
          think about it.&quot;
          <footer>
            Gene Cernan
            <br />
            Commander, Apollo 17
            <br />
            The last man to walk on the moon
          </footer>
        </blockquote>
        <h3>
          <a href="http://benfeist.com/project-apollo-17/" target="_blank" rel="noopener">
            About This Project
          </a>
        </h3>
        <h3>
          <a
            href="http://benfeist.com/digitizing-apollo-17-part-16-new-apollo17-org-44th-anniversary-edition/"
            target="_blank"
            rel="noopener"
          >
            Leave a Comment
          </a>
        </h3>
      </div>
      <Credits17 />
      <div className={styles.missionAboutAwards}>
        <img src={A17_WEBBY_AWARD} alt="Webby Awards nominee" />
        <img src={A17_AWWWARDS_NOMINEE} alt="Awwwards nominee" />
      </div>
    </>
  );
}

function Credits17() {
  return (
    <section className={styles.missionAboutCredits}>
      <h3>Credits</h3>
      <p>
        <strong>Ben Feist:</strong> Concept, research, mission data restoration, audio/video,
        architecture and programming. Follow{" "}
        <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">
          @BenFeist
        </a>{" "}
        for updates.
        <br />
        <strong>Chris Bennett:</strong> Visual design, interface styling and programming.
      </p>
      <h3>Thanks</h3>
      <p>
        <strong>David Woods:</strong> Author,{" "}
        <a href="http://www.hafttm.com/" target="_blank" rel="noopener">
          How Apollo Flew to the Moon
        </a>
        <br />
        <strong>Kipp Teague:</strong>{" "}
        <a
          href="https://www.flickr.com/photos/projectapolloarchive/albums"
          target="_blank"
          rel="noopener"
        >
          Apollo mission photography
        </a>
        <br />
        <strong>Stephen Slater:</strong> Archive Producer,{" "}
        <a href="https://www.facebook.com/thelastmanonthemoon/" target="_blank" rel="noopener">
          Last Man on the Moon
        </a>
        <br />
        <strong>Dr. Noah Petro and Ernie Wright:</strong>{" "}
        <a href="https://lunar.gsfc.nasa.gov/" target="_blank" rel="noopener">
          Lunar Reconnaissance Orbiter, NASA
        </a>
        <br />
        <strong>Robin Wheeler:</strong> Transcript corrections
        <br />
        <strong>Apollo Flight Journal</strong>
        <br />
        <strong>Apollo Lunar Surface Journal</strong>
        <br />
        <strong>Houston Audio Control Room, Johnson Space Center, NASA</strong>
        <br />
        <strong>Internet Archive</strong>
        <br />
        <strong>The crew of Apollo 17</strong>
      </p>
    </section>
  );
}

function MissionAboutHeaderHelp() {
  return (
    <div className={styles.missionAboutHeaderHelp} aria-hidden="true">
      <div className={styles.missionAboutLegend}>
        <div>Mission Navigator Color Codes:</div>
        <ul>
          <li>
            <i className={styles.isInterest}></i>Point of interest (see Guided Tour)
          </li>
          <li>
            <i className={styles.isPhoto}></i>Photograph Taken
          </li>
          <li>
            <i className={styles.isCrew}></i>
            <i className={styles.isMocr}></i>
            <i className={styles.isPao}></i>Crew / Mission Control speech
          </li>
          <li>
            <i className={styles.isVideo}></i>Video Segment <i className={styles.isAnimation}></i>3D
            Animation
          </li>
        </ul>
      </div>
      <ol className={styles.missionAboutNavigatorKey}>
        <li>
          <span>Entire mission (13 days)</span>
        </li>
        <li>
          <span>Zoomed to 15 hour window</span>
        </li>
        <li>
          <span>Zoomed to 1.5 hour window</span>
        </li>
      </ol>
    </div>
  );
}
