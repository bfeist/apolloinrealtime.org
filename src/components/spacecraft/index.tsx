/** Apollo 13's original educational copy and spacecraft rotation film. */
import { useEffect, useRef, useState } from "react";
import styles from "./SpacecraftPanel.module.css";

export function SpacecraftPanel({
  config,
  visible = true,
}: {
  config: MissionConfig;
  visible?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void video.play().catch(() => {
        /* Native controls handle blocked autoplay. */
      });
    } else video.pause();
    return () => {
      video.pause();
    };
  }, [visible]);
  return (
    <>
      <figure className={styles.spacecraftPanelMedia}>
        <video
          ref={videoRef}
          className={styles.spacecraftPanelVideo}
          data-testid="spacecraft-video"
          controls
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => {
            setMediaError(true);
          }}
          aria-label="Rotating view of the Apollo 13 command, service and lunar modules"
        >
          <source
            src={`${config.mediaRoot}/apollo13_rotate8_2.mp4`}
            type="video/mp4"
            onError={() => {
              setMediaError(true);
            }}
          />
          Your browser does not support this spacecraft video.
        </video>
        <figcaption>Odyssey and Aquarius — Apollo 13</figcaption>
        <p className={styles.spacecraftPanelMediaStatus} hidden={!mediaError}>
          Spacecraft video is unavailable. The spacecraft information is below.
        </p>
      </figure>
      <article className={styles.spacecraftPanelIntroduction}>
        <h2>The Apollo 13 Spacecraft</h2>
        <div className={styles.copy}>
          <p>
            {" "}
            The Apollo lunar missions required two spacecraft - one to get them to the Moon, and
            another one to perform the two-man lunar landing and return to orbit. After launch, the
            Command Service Module was docked onto the Lunar Module and the two spacecraft spent the
            rest of the mission joined together. For 13, the Command Module was called ‘Odyssey’ and
            the Lunar Module was called ‘Aquarius’. The crew stayed in the Command Module until it
            was time to prepare for the lunar landing.{" "}
          </p>
        </div>
        <h3>The Command and Service Module</h3>
        <div className={styles.copy}>
          <p>
            {" "}
            The Command Module was a cone-shaped spacecraft that contained all the equipment and
            machinery for the crew to make the flight to the Moon and back. This included their
            navigational equipment, radios, life support and crew accommodations. Beneath it, the
            cylindrical Service Module provided them with oxygen to breathe, electrical power, and
            also had the big Service Propulsion System engine for braking onto lunar orbit. Three
            fuel cells produced electrical power and drinking water from hydrogen and oxygen stored
            in tanks in the Service Module. When together, these were referred to as the Command
            Service Module (CSM).{" "}
          </p>
          <h4>The Apollo 13 Incident</h4>
          <p>
            {" "}
            At 55 hours, 55 minutes into the flight of Apollo 13, a short circuit inside one of the
            cryogenic oxygen tanks caused the tank to explode. This tore away one side of the
            Service Module and damaged the other oxygen tank and the main antenna. The force of the
            explosion shut off two of the three fuel cells and left Apollo 13 with little power.
            With the oxygen leaking out slowly, they only had a few hours to come to a solution to
            save the crew.{" "}
          </p>
        </div>
        <h3>The Lunar Module</h3>
        <div className={styles.copy}>
          <p>
            {" "}
            The Lunar Module (LM) was a highly specialized spacecraft designed with the sole purpose
            of taking two men onto the lunar surface and returning them to the Command Module. The
            LM consisted of the small Ascent Stage on the top that included the crew quarters and
            all their equipment, and the larger Descent Stage that included the descent engine and
            landing legs, and larger water and oxygen tanks and batteries for storing electric
            power. In order to save weight, the Descent Stage was designed to be left on the lunar
            surface when the crew returned to lunar orbit.{" "}
          </p>
          <p>
            {" "}
            After the onboard explosion disabled the CSM, the LM was used as a lifeboat to keep the
            crew alive. They had to make the LM's supply of oxygen, water and battery power last
            four days in deep space, instead of the designed 2-day, 2-man lunar landing mission.
            Instead of being used to descend to the lunar surface, the LM engine was fired to speed
            up the crew's return to Earth and later to course correct. The LM's batteries were used
            to recharge the Command Module's batteries that were needed to enable the computer and
            thrusters to operate during reentry, and enable the pyros to fire that opened the
            parachutes after reentry.{" "}
          </p>
        </div>
      </article>
    </>
  );
}
