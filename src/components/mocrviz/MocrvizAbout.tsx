import type { MocrMissionId } from "./urls.js";

interface AboutCopy {
  hours: string;
  year: string;
  digitization: string;
  images: readonly string[];
  processingHours: string;
  utterances: string;
  words: string;
  size: string;
  version: string;
  accuracy: string;
}

const ABOUT_COPY: Readonly<Record<MocrMissionId, AboutCopy>> = {
  "11": {
    hours: "11,000",
    year: "1969",
    digitization:
      "The original tranche of transfers were supplied to the Apollo in Real time team in 2017 along with 7,000 hours of Apollo 13 audio.",
    images: [
      "11_image_01.jpg",
      "11_tape_01.jpg",
      "11_tape_02.jpg",
      "11_tape_03.jpg",
      "11_tape_04.jpg",
    ],
    processingHours: "1200",
    utterances: "4,803,618",
    words: "42,684,618",
    size: "224MB",
    version: "2024-10-25",
    accuracy:
      "The Apollo in Real Time team will not endeavor to manually correct these generated transcripts. Instead, as automated transcription technology improves over time, the audio will be re-processed, replacing these transcripts.",
  },
  "13": {
    hours: "7,200",
    year: "1970",
    digitization:
      "The original tranche of transfers were supplied to the Apollo in Real time team in 2017 along with all 11,000 hours of Apollo 11 audio.",
    images: [
      "13_tape_1.jpg",
      "13_tape_3.jpg",
      "13_tape_4.jpg",
      "13_tape_5.jpg",
      "13_tape_6.jpg",
      "13_tape_2.jpg",
    ],
    processingHours: "750",
    utterances: "3,936,510",
    words: "37,503,659",
    size: "199MB",
    version: "2024-10-18",
    accuracy:
      "The Apollo in Real Time team will not be endeavoring to manually correct these generated transcripts. Instead, as automated transcription technology improves over time the audio will be re-processed, replacing these transcripts.",
  },
};

/** Original mission-specific About content, rendered by React alongside the transcript. */
export function MocrvizAbout({ mission, hidden }: { mission: MocrMissionId; hidden: boolean }) {
  const copy = ABOUT_COPY[mission];
  const imageRoot = `/${mission}/MOCRviz/img`;
  return (
    <div className="mocrviz-transcript-about" hidden={hidden}>
      <div className="title">About This Mission Control Audio</div>
      <div className="copy">
        This Mission Control audio consists of {copy.hours} hours of flight controller conversation
        recorded from each headset in Mission Control and several backrooms throughout the mission.
      </div>
      <div className="subtitle">Digitization</div>
      <div className="copy">
        <p>
          The tapes containing this audio were digitized in a{" "}
          <a
            href="https://www.nasa.gov/feature/nasa-university-of-texas-at-dallas-reveal-apollo-11-behind-the-scenes-audio"
            target="_blank"
            rel="noopener noreferrer"
          >
            multi-year effort
          </a>{" "}
          funded by the National Science Foundation under the guidance of Prof. John Hansen at UT
          Dallas. {copy.digitization}
        </p>
        {mission === "13" ? (
          <p>
            The mission tapes surrounding the Apollo 13 explosion were later discovered in the
            National Archives, having been separated from the others for many decades, due to their
            use in the post-mission congressional investigation tasked to find the cause of the
            on-board explosion. They were digitized by NASA's Johnson Space Center (JSC) in February
            and March, 2020 with the help of JSC Historical Preservation Officer, Sandra Tetley.
          </p>
        ) : null}
      </div>
      <div className="mocrviz-about-images">
        {copy.images.map((image) => (
          <a key={image} href={`${imageRoot}/${image}`} target="_blank" rel="noopener noreferrer">
            <img
              src={`${imageRoot}/${image}`}
              height="70"
              alt={`Apollo ${mission} Mission Control audio tape`}
            />
          </a>
        ))}
      </div>
      <div className="subtitle">Processing</div>
      <div className="copy">
        <p>
          The Soundscriber machine that played back each tape for digitization is the only remaining
          machine of its kind in the world. It was built around the time of the Apollo missions and
          even though it was refurbished prior to digitization, it still introduced severe
          distortions to the audio during the playback process and subsequent digital files.
        </p>
        <p>
          These artifacts, known as "wow" (a long term, random drift that makes the ~16 hour long
          tapes play back up to an hour longer than originally recorded) and "flutter" (a short term
          drift that makes the sounds warble in pitch about three times a second) were corrected
          using a custom algorithm developed by Apollo in Real Time team member,{" "}
          <a href="https://twitter.com/ke6jjj" target="_blank" rel="noopener noreferrer">
            Jeremy Cooper
          </a>
          . The resulting digital files are a near-perfect representation of what was originally
          recorded on the tapes at the time of the mission. Since they contain no time variation and
          contain an original timing signal in a standard format (known as an IRIG-B), the corrected
          files as a whole are the primary source material that the team relies upon when publishing
          the exact timing of mission events, including the synchronization of video sources in the
          timeline. They are indisputably historically accurate.
        </p>
      </div>
      <div className="title">About These Mission Control Transcripts</div>
      <div className="copy">
        <p>
          Unlike the main space-to-ground transcript (left), which is based upon the original
          mission transcript that was manually typewritten in {copy.year}, the transcripts provided
          here have been generated using the "large-v3"{" "}
          <a
            href="https://openai.com/blog/whisper/"
            target="_blank"
            rel="noopener noreferrer"
            className="openAiLink"
            aria-label="OpenAI Whisper"
          >
            <svg className="openAiLogo" viewBox="0 0 936 232" role="img" aria-label="OpenAI">
              <path d="M667.2 90.6c-13.8 0-23.6 4.7-28.4 13.6l-2.6 4.8V92.9h-22.4v97.9h23.5v-58.2c0-13.9 7.6-21.9 20.7-21.9 12.6 0 19.8 7.8 19.8 21.3v58.8h23.6v-63c0-23.3-12.8-37.2-34.2-37.2ZM553 90.6c-27.8 0-45 17.3-45 45.2v13.7c0 26.8 17.4 43.5 45.4 43.5 18.8 0 31.9-6.9 40.2-21l-14.6-8.4c-6.1 8.1-15.9 13.2-25.5 13.2-14.2 0-22.7-8.8-22.7-23.4v-3.9h65.7v-16.2c0-26-17-42.7-43.5-42.7Zm22.1 43.1h-44.4v-2.4c0-16.1 7.9-25 22.3-25 13.8 0 22.1 8.8 22.1 23.4v4ZM935.3 76.8V58.1h-81.5v18.7h28.6V172h-28.6v18.7h81.5V172h-28.6V76.8h28.6ZM317.6 55.4c-36.4 0-59 22.7-59 59.2v19.7c0 36.5 22.6 59.2 59 59.2s59-22.7 59-59.2v-19.7c0-36.6-22.6-59.2-59-59.2Zm34.7 80.2c0 24.2-12.6 38.1-34.7 38.1S283 159.9 283 135.6v-22.4c0-24.2 12.6-38.1 34.7-38.1s34.7 13.9 34.7 38.1l-.1 22.4ZM450.6 90.6c-12.4 0-23.1 5.1-28.6 13.7l-2.5 3.9V92.9H397v131.5h23.6v-47.6l2.5 3.7c5.3 7.9 15.6 12.6 27.7 12.6 20.3 0 40.8-13.3 40.8-42.9v-16.6c0-21.5-12.6-43-41-43Zm17.5 58.4c0 15.8-9.2 25.6-24 25.6-13.8 0-23.4-10.4-23.4-25.2v-14.7c0-15 9.7-25.6 23.6-25.6 14.7 0 23.8 9.8 23.8 25.6V149ZM766.5 58.1 719 190.8h23.9l9.1-28.4h54.6l.1.3 9 28.2h23.9L792.1 58.1h-25.6Zm-8.6 85.5 21.4-67.1 21.2 67.1h-42.6Z" />
              <path d="M212.6 95.1c5.2-15.7 3.4-32.8-4.9-47-12.6-21.8-37.8-33.1-62.4-27.8C134.3 7.9 118.6.9 102.1 1 76.9.9 54.5 17.2 46.8 41.1 30.6 44.5 16.7 54.6 8.5 68.9c-12.6 21.8-9.7 49.2 7.1 67.9-5.2 15.6-3.4 32.8 4.9 47C33.1 205.7 58.3 217 83 211.7c10.9 12.3 26.7 19.4 43.2 19.3 25.2.1 47.5-16.2 55.3-40.1 16.2-3.3 30.1-13.4 38.3-27.8 12.6-21.8 9.7-49.3-7.2-68ZM126.2 216c-10.1 0-19.8-3.5-27.6-10 .3-.2 1-.5 1.4-.8l45.8-26.4c2.3-1.3 3.8-3.8 3.8-6.5v-64.6l19.4 11.2c.2.1.4.3.4.5v53.5c-.1 23.8-19.4 43.1-43.2 43.1ZM33.6 176.5c-5-8.7-6.9-18.9-5.1-28.9.3.2.9.6 1.4.8l45.8 26.4c2.3 1.4 5.2 1.4 7.5 0l55.9-32.3v22.3c0 .2-.1.5-.3.6l-46.3 26.7c-20.7 11.9-47 4.9-58.9-15.6ZM21.6 76.5c5-8.7 13-15.4 22.4-18.9V112c0 2.7 1.4 5.2 3.8 6.5l55.9 32.3L84.2 162c-.2.1-.4.2-.7.1l-46.3-26.7c-20.5-12-27.6-38.3-15.6-58.9Zm159 37-55.9-32.3L144 70c.2-.1.4-.2.6-.1l46.3 26.7c20.6 11.9 27.7 38.3 15.8 58.9-5 8.7-13 15.4-22.4 18.9V120c0-2.7-1.4-5.2-3.7-6.5Zm19.2-29c-.3-.2-.9-.6-1.4-.8l-45.8-26.5c-2.3-1.4-5.2-1.4-7.5 0L89.2 89.5V67.1c0-.2.1-.5.3-.6l46.3-26.7c20.6-11.9 47-4.8 58.9 15.8 5 8.8 6.8 19 5.1 28.9ZM78.7 124.3l-19.4-11.2c-.2-.1-.3-.3-.4-.5V59.1C59 35.3 78.2 16 102 16c10.1 0 19.9 3.5 27.6 10-.3.2-.9.5-1.4.8L82.5 53.2c-2.3 1.3-3.8 3.8-3.8 6.5v64.6Zm10.5-22.7 24.9-14.4 24.9 14.4v28.7l-24.9 14.4-24.9-14.4v-28.7Z" />
            </svg>
          </a>{" "}
          Whisper model.
        </p>
        <p>
          {mission === "13" ? "The Whisper AI processing" : "The processing"} of the{" "}
          <span className="highlighted">{copy.hours} hours</span> of Mission Control audio required
          over <span className="highlighted">{copy.processingHours} hours</span> of computer time.
          The resulting transcripts contain{" "}
          <span className="highlighted">{copy.utterances} utterances</span>, consisting of{" "}
          <span className="highlighted">{copy.words} words</span>, totaling{" "}
          <span className="highlighted">{copy.size} of text</span>. Download the transcripts for all
          mission control channels in a single file{" "}
          <a
            href={`https://media.apolloinrealtime.org/A${mission}/MOCR_audio/transcripts/allChannelsTranscript.zip`}
          >
            here
          </a>{" "}
          (version {copy.version}).
        </p>
      </div>
      <div className="subtitle">Accuracy and Timing</div>
      <div className="copy">
        <p>As valuable as these results are, they remain imperfect. {copy.accuracy}</p>
        <p>
          The Apollo in Real Time team is grateful to the OpenAI team for the development and
          open-source release of Whisper.
        </p>
      </div>
    </div>
  );
}
