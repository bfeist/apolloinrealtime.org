import { A17_AWWWARDS_NOMINEE, A17_WEBBY_AWARD } from "./a17AwardImages.js";

/** Historical Instructions / Credits copy, transcribed from each legacy mission's help overlay. */
export function missionAboutContent(config: MissionConfig): string {
  switch (config.id) {
    case "11":
      return `<div class="mission-about__intro">
  <h2>A real-time journey through the first landing on the Moon</h2>
  <h3>Introduction</h3>
  <p>This website replays the Apollo 11 mission as it happened. It consists entirely of historical material, all timed to Ground Elapsed Time--the master mission clock. Footage of Mission Control, film shot by the astronauts, and television broadcasts transmitted from space and the surface of the Moon, have been painstakingly placed to the very moments they were shot during the mission, as has every photograph taken, and every word spoken.</p>
  <h3>Interface</h3>
  <p>Upon starting the application, select whether to begin one minute before launch, or click &quot;Now&quot; to drop in to the mission using today's date and time, to-the-second during the anniversary.</p>
  <p>Navigate to any moment of the mission using the time navigator at the top of the screen. The top bar is the entire mission with two bars below it providing magnification. Selecting transcript items, photos, commentary items, or guided tour moments, also jumps the mission time to the moment they occurred.</p>
  <p>Main mission audio consists of space-to-ground (left ear), capcom loop (right ear), and on-board recorder (center, when available). Selecting a Mission Control audio channel mutes the main audio, opens the Mission Control audio panel, and plays the &quot;live&quot; audio of that Mission Control position. Change channels by selecting the seats in mission control. Closing the Mission Control audio panel will unmute the main audio and continue mission playback.</p>
  <p>These 50 channels of Mission Control audio have only recently been digitized and restored, and are made publicly available here for the first time. They total over 11,000 hours in length.</p>
  <p>Please contact <a href="http://benfeist.com" target="_blank" rel="noopener">Ben Feist</a> for any inquiries.</p>
  <img src="/11/img/help_callouts.jpg" alt="Apollo 11 interface callouts" /><img src="/11/img/navigator_key.jpg" alt="Apollo 11 navigator key" />
  <blockquote>&quot;I think we're going to the moon because it's in the nature of the human being to face challenges. It's by the nature of his deep inner soul... we're required to do these things just as salmon swim upstream.&quot;<footer>— Neil Armstrong<br />Commander, Apollo 11</footer></blockquote>
  <blockquote>&quot;Space is not just going up and coming back down again. Space is getting into orbit and being there, living there, establishing a presence, a permanence.&quot;<footer>— Buzz Aldrin<br />Lunar Module Pilot, Apollo 11</footer></blockquote>
  <blockquote>&quot;I knew I was alone in a way that no earthling has ever been before.&quot;<footer>— Michael Collins<br />Command Module Pilot, Apollo 11</footer></blockquote>
</div>${credits11()}`;
    case "13":
      return `<div class="mission-about__intro">
  <h2>A real-time journey through the Apollo 13 mission</h2><h3>Introduction</h3>
  <p>This website replays the Apollo 13 mission as it happened. It consists entirely of historical material, all timed to Ground Elapsed Time--the master mission clock. Footage of Mission Control, film shot by the astronauts, and television broadcasts transmitted from space have been painstakingly placed to the very moments they were shot during the mission, as has every photograph taken, and every word spoken.</p>
  <p>This project includes newly digitized and restored mission control audio. The last tapes of these recordings were discovered in the National Archives fall of 2019 and were digitized in February, 2020 and contain the time surrounding the onboard explosion. These recordings haven't been heard since the accident investigation in 1970.</p>
  <h3>Interface</h3><p>Upon starting the application, select whether to begin one minute before launch, or click &quot;Now&quot; to drop in to the mission using today's date and time.</p>
  <p>Navigate to any moment of the mission using the time navigator at the top of the screen. The top bar is the entire mission with two bars below it providing magnification. Clicking transcript items, photos, commentary items, or guided tour moments also jumps the mission time to those events.</p>
  <p>Main mission audio consists of space-to-ground (left ear), capcom loop (right ear), and on-board recorder (center, when available). Selecting a Mission Control audio channel mutes the main audio, opens the Mission Control audio panel, and plays the &quot;live&quot; audio of each selected Mission Control position. Change channels by selecting the seats in Mission Control. Closing the Mission Control audio panel will unmute the main audio and continue mission playback.</p>
  <p>These 50 channels of Mission Control audio spanning the entire mission have only recently been digitized and restored, and are made publicly available here for the first time. They total over 7,200 hours in length.</p>
  <p>Please contact <a href="http://benfeist.com" target="_blank" rel="noopener">Ben Feist</a> for any inquiries.</p>
  <img src="/13/img/help_callouts.jpg" alt="Apollo 13 interface callouts" /><img src="/13/img/navigator_key.jpg" alt="Apollo 13 navigator key" />
  <blockquote>&quot;I could put my thumb up to a window and completely hide the Earth. I thought, 'Everything I've ever known is behind my thumb.'&quot;<footer>— Jim Lovell<br />Commander, Apollo 13</footer></blockquote>
  <blockquote>&quot;My biggest emotion on Apollo 13 after the oxygen tank explosion was disappointment that we had lost the landing.&quot;<footer>— Fred Haise<br />Lunar Module Pilot, Apollo 13</footer></blockquote>
  <blockquote>&quot;Okay, Houston, we've had a problem here.&quot;<footer>— Jack Swigert<br />Command Module Pilot, Apollo 13</footer></blockquote>
</div>${credits13()}`;
    case "17":
      return `<div class="mission-about__intro"><h2>A real-time interactive journey through the last landing on the Moon.</h2>
  <blockquote>&quot;When I left the Moon and started up the ladder, I was really at a loss. I didn't want to leave and I looked down at my last footsteps and realised I wasn't coming this way again. Looking back over my shoulder at the Earth had a particular significance to me – it was alive, it was moving, with purpose and beauty through space and time. In those short few minutes I wanted to figure out what was the meaning of us – everyone alive in the world today…I wanted to press the freeze button, stop time to give myself a chance to think about it.&quot;<footer>Gene Cernan<br />Commander, Apollo 17<br />The last man to walk on the moon</footer></blockquote>
  <h3><a href="http://benfeist.com/project-apollo-17/" target="_blank" rel="noopener">About This Project</a></h3>
  <h3><a href="http://benfeist.com/digitizing-apollo-17-part-16-new-apollo17-org-44th-anniversary-edition/" target="_blank" rel="noopener">Leave a Comment</a></h3></div>${credits17()}
  <div class="mission-about__awards"><img src="${A17_WEBBY_AWARD}" alt="Webby Awards nominee" /><img src="${A17_AWWWARDS_NOMINEE}" alt="Awwwards nominee" /></div>`;
    default:
      return "";
  }
}

export function missionAboutHeaderHelp(config: MissionConfig): string {
  if (config.id !== "17") return "";
  return `<div class="mission-about__header-help" aria-hidden="true">
    <div class="mission-about__legend">
      <div>Mission Navigator Color Codes:</div>
      <ul>
        <li><i class="is-interest"></i>Point of interest (see Guided Tour)</li>
        <li><i class="is-photo"></i>Photograph Taken</li>
        <li><i class="is-crew"></i><i class="is-mocr"></i><i class="is-pao"></i>Crew / Mission Control speech</li>
        <li><i class="is-video"></i>Video Segment <i class="is-animation"></i>3D Animation</li>
      </ul>
    </div>
    <ol class="mission-about__navigator-key">
      <li><span>Entire mission (13 days)</span></li>
      <li><span>Zoomed to 15 hour window</span></li>
      <li><span>Zoomed to 1.5 hour window</span></li>
    </ol>
  </div>`;
}

function credits11(): string {
  return credits(
    `Ben Feist|Concept, research, mission data restoration, audio restoration, video, software architecture and programming. Follow <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">@BenFeist</a> for updates.

Stephen Slater|Archive Producer, historical audio/footage synchronization

Chris Bennett|Visual design, interface styling and programming
David Charney|Visual design
Arnfinn Holderer|Audio restoration programming

Robin Wheeler|Photography timing, transcript corrections`,
    `Todd Miller|Director, <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">Apollo 11</a> film
Tom Petersen|Producer, <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">Apollo 11</a> film
Dr. John Hansen and the National Science Foundation|30-track Mission Control <a href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes" target="_blank" rel="noopener">audio digitization</a>. More info at <a href="http://exploreapollo.org" target="_blank" rel="noopener">exploreapollo.org</a>
_Lunar and Planetary Institute
Jamie Shumbera|Operations Manager
_NASA Headquarters
Dr. Bill Barry|Chief Historian, NASA HQ
Dr. Jacob Bleacher|Chief Exploration Scientist, NASA HQ
_NASA Johnson Space Center
Dr. Cindy Evans|Division Chief, Astromaterials Research and Exploration Science (ARES) Division, NASA JSC
Dan Garrison|Jacobs Technology, NASA JSC
Dr. Ryan Zeigler|Manager, Apollo Curator, ARES, NASA JSC
Dr. Paul Niles|Assistant Chief Scientist, ARES NASA JSC
Sandra Tetley|Real Property Officer, Historic Preservation Officer, NASA JSC
Greg Wiseman|30-track Mission Control <a href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes" target="_blank" rel="noopener">audio digitization</a>, NASA JSC
_NASA Goddard Space Flight Center
Dr. Noah Petro|Project Scientist, Lunar Reconnaissance Orbiter. Planetary Geology, Geochemistry and Geophysics Lab, NASA Goddard
David Woods|Author, <a href="http://www.hafttm.com/" target="_blank" rel="noopener">How Apollo Flew to the Moon</a>
Kipp Teague|<a href="https://www.flickr.com/photos/projectapolloarchive/albums" target="_blank" rel="noopener">Apollo mission photography</a>
Paul Vanezis|EVA footage
NASA Apollo Flight Journal|
NASA Apollo Lunar Surface Journal|
Internet Archive|
The crew of Apollo 11|
The men and women of Mission Control|
_Beta Testers
Mike Dinn|
Jacqueline Poole|
Todd Green|
Ian House|
Joey Schwartz|
David Charney|
Sammy Goldberg|
Robin Wheeler|
Joe Davenport|
Linden Sims|
Suzanne Molina|
Kevin Spencer|`,
    "THIS WEBSITE IS THE COPYRIGHT OF BEN FEIST ©2019.<br /><br />THE ARCHIVE MATERIAL ON THIS WEBSITE COMPRISES NASA AUDIO RESTORED BY BEN FEIST AND NASA SYNCHRONISED AUDIO/VISUAL MATERIAL PROVIDED BY STEPHEN SLATER.<br /><br />ANY SYNCHRONISED FOOTAGE MAY ONLY BE REPRODUCED AND UTILISED WITH THE PRIOR WRITTEN PERMISSION OF STEPHEN SLATER. ALL RIGHTS IN THE SYNCHRONISED FOOTAGE ARE EXPRESSLY RESERVED TO STEPHEN SLATER.",
  );
}

function credits13(): string {
  return credits(
    `Ben Feist|Concept, research, mission data restoration, audio restoration, video editing, software architecture and programming. Follow <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">@BenFeist</a> for updates.

Stephen Slater|Archive research and production, historical audio/film synchronization
David Charney|Visual design, 3D modeling
Jeremy Cooper|Audio restoration programming
Johannes Kemppanen|Transcript corrections, additional historical research <a href="https://history.nasa.gov/afj/ap13fj/index.html" target="_blank" rel="noopener">Editor of the Apollo 13 Flight Journal</a>
Robin Wheeler|Photography timing, transcript corrections <a href="https://history.nasa.gov/afj/ap10fj" target="_blank" rel="noopener">Editor of the Apollo 10 Flight Journal</a>
Greg Wiseman|30-track Mission Control <a href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes" target="_blank" rel="noopener">audio digitization</a>, NASA JSC
Ernie Wright|Lunar LRO Animations <a href="https://svs.gsfc.nasa.gov/" target="_blank" rel="noopener">Scientific Visualization Studio</a>, NASA Goddard
Issa Tseng|Flight Director loop audio transcription <a href="http://apollo13realtime.org/" target="_blank" rel="noopener">apollo13realtime.org</a>
Chris Bennett|Visual design, interface styling and programming`,
    `Dan Rooney|Supervisory Archivist, Special Media Archives Services Division, National Archives
_NASA Headquarters
Dr. Bill Barry|Chief Historian, NASA HQ
Dr. Jacob Bleacher|Chief Exploration Scientist, NASA HQ
_NASA Johnson Space Center
Sandra Tetley|Real Property Officer, Historic Preservation Officer, NASA JSC
John Stoll|Public Affairs Audio Control Room, NASA JSC
Dan Garrison|Jacobs Technology, NASA JSC
Dr. Ryan Zeigler|Manager, Apollo Curator, ARES, NASA JSC
Dr. Paul Niles|Assistant Chief Scientist, ARES NASA JSC
_NASA Goddard Space Flight Center
Dr. Noah Petro|Project Scientist, Lunar Reconnaissance Orbiter. Planetary Geology, Geophysics, and Geochemistry Lab, NASA GSFC
_University of Texas – Dallas, Center for Robust Speech Systems (CRSS-UTDallas)
Special thanks to the research team at CRSS-UTDallas under the leadership of Dr. John Hansen|for their work in creating the Fearless Steps APOLLO Community Resource, and National Science Foundation (NSF) CCRI funded project, resulting in the recovery of all Apollo mission audio, and full speaker/speech diarization of all 150,000hrs of communications. Details found at the: <a href="http://exploreapollo.org" target="_blank" rel="noopener">CRSS-UTDallas Explore Apollo website</a>, and NASA Podcast <a href="https://www.nasa.gov/johnson/HWHAP/heroes-behind-the-heroes" target="_blank" rel="noopener">“Heroes Behind the Heroes” Audio Digitizing Recovery</a>.
Todd Miller|Director, <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">Apollo 11</a> film
Tom Petersen|Producer, <a href="https://www.apollo11movie.com/" target="_blank" rel="noopener">Apollo 11</a> film
_Lunar and Planetary Institute
Jamie Shumbera|Operations Manager
David Woods|Author, <a href="http://www.hafttm.com/" target="_blank" rel="noopener">How Apollo Flew to the Moon</a>
NASA Apollo Flight Journal|
NASA Apollo Lunar Surface Journal|
Internet Archive|
The crew of Apollo 13|
The men and women of Mission Control|`,
    "THIS WEBSITE IS THE COPYRIGHT OF BEN FEIST ©2020.<br /><br />THE ARCHIVE MATERIAL ON THIS WEBSITE COMPRISES NASA AUDIO RESTORED BY BEN FEIST AND NASA SYNCHRONISED AUDIO/VISUAL MATERIAL PROVIDED BY STEPHEN SLATER.<br /><br />ANY SYNCHRONISED FOOTAGE MAY ONLY BE REPRODUCED AND UTILISED WITH THE PRIOR WRITTEN PERMISSION OF STEPHEN SLATER. ALL RIGHTS IN THE SYNCHRONISED FOOTAGE ARE EXPRESSLY RESERVED TO STEPHEN SLATER.",
  );
}

function credits17(): string {
  return credits(
    `Ben Feist:|Concept, research, mission data restoration, audio/video, architecture and programming. Follow <a href="https://twitter.com/benfeist" target="_blank" rel="noopener">@BenFeist</a> for updates.
Chris Bennett:|Visual design, interface styling and programming.`,
    `David Woods:|Author, <a href="http://www.hafttm.com/" target="_blank" rel="noopener">How Apollo Flew to the Moon</a>
Kipp Teague:|<a href="https://www.flickr.com/photos/projectapolloarchive/albums" target="_blank" rel="noopener">Apollo mission photography</a>
Stephen Slater:|Archive Producer, <a href="https://www.facebook.com/thelastmanonthemoon/" target="_blank" rel="noopener">Last Man on the Moon</a>
Dr. Noah Petro and Ernie Wright:|<a href="https://lunar.gsfc.nasa.gov/" target="_blank" rel="noopener">Lunar Reconnaissance Orbiter, NASA</a>
Robin Wheeler:|Transcript corrections
Apollo Flight Journal|
Apollo Lunar Surface Journal|
Houston Audio Control Room, Johnson Space Center, NASA|
Internet Archive|
The crew of Apollo 17|`,
    "",
  );
}

function credits(creditLines: string, thankLines: string, legal: string): string {
  const section = (lines: string, footer = "") => {
    const rows = lines
      .split("\n")
      .map((line) => {
        // The legacy overlays use one paragraph per section, with deliberate
        // double breaks before group labels. Preserve that flow instead of
        // turning every credit into a separately-spaced paragraph.
        if (line.startsWith("_")) {
          return `<br /><span class="mission-about__subheading">${line.slice(1)}</span>`;
        }
        if (!line) return "";
        const [name = "", description] = line.split("|");
        return `<strong>${name}</strong>${description ? ` ${description}` : ""}`;
      })
      .join("<br />");
    const legacyFooter = footer
      ? `<br /><br /><span class="mission-about__legal">${footer}</span>`
      : "";
    return `<p>${rows}${legacyFooter}</p>`;
  };
  return `<section class="mission-about__credits"><h3>Credits</h3>${section(creditLines)}<h3>Thanks</h3>${section(thankLines, legal)}</section>`;
}
