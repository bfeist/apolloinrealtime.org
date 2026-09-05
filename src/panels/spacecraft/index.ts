/** A13's production Spacecraft tab, independent of the retired spacecraft_dev app.
 * Source copy: legacy-oracle/13/index.html#spacecraftDescription.
 * The original rotation video stays on the mission media CDN. */
import "../../styles/panels/spacecraft.css";

export interface SpacecraftPanel {
  /** Main shell owns tab selection; hidden rotation video is always paused. */
  setVisible(visible: boolean): void;
  destroy(): void;
}

/** Mount once; reselecting the tab preserves scroll and video position. */
export function mountSpacecraftPanel(host: HTMLElement): SpacecraftPanel {
  host.classList.add("spacecraft-panel");
  host.hidden = true;
  host.innerHTML = `
    <figure class="spacecraft-panel__media">
      <video class="spacecraft-panel__video" controls loop muted playsinline preload="metadata"
        aria-label="Rotating view of the Apollo 13 command, service and lunar modules">
        <source src="https://media.apolloinrealtime.org/A13/apollo13_rotate8_2.mp4" type="video/mp4">
        Your browser does not support this spacecraft video.
      </video>
      <figcaption>Odyssey and Aquarius — Apollo 13</figcaption>
      <p class="spacecraft-panel__media-status" hidden>Spacecraft video is unavailable. The spacecraft information is below.</p>
    </figure>
<article class="spacecraft-panel__introduction">
<h2>The Apollo 13 Spacecraft</h2>
<div class="copy">
<p> The Apollo lunar missions required two spacecraft - one to get them to the Moon, and another one to perform the two-man lunar landing and return to orbit. After launch, the Command Service Module was docked onto the Lunar Module and the two spacecraft spent the rest of the mission joined together. For 13, the Command Module was called ‘Odyssey’ and the Lunar Module was called ‘Aquarius’. The crew stayed in the Command Module until it was time to prepare for the lunar landing. </p>
</div>
<h3>The Command and Service Module</h3>
<div class="copy">
<p> The Command Module was a cone-shaped spacecraft that contained all the equipment and machinery for the crew to make the flight to the Moon and back. This included their navigational equipment, radios, life support and crew accommodations. Beneath it, the cylindrical Service Module provided them with oxygen to breathe, electrical power, and also had the big Service Propulsion System engine for braking onto lunar orbit. Three fuel cells produced electrical power and drinking water from hydrogen and oxygen stored in tanks in the Service Module. When together, these were referred to as the Command Service Module (CSM). </p>
<h4>The Apollo 13 Incident</h4>
<p> At 55 hours, 55 minutes into the flight of Apollo 13, a short circuit inside one of the cryogenic oxygen tanks caused the tank to explode. This tore away one side of the Service Module and damaged the other oxygen tank and the main antenna. The force of the explosion shut off two of the three fuel cells and left Apollo 13 with little power. With the oxygen leaking out slowly, they only had a few hours to come to a solution to save the crew. </p>
</div>
<h3>The Lunar Module</h3>
<div class="copy">
<p> The Lunar Module (LM) was a highly specialized spacecraft designed with the sole purpose of taking two men onto the lunar surface and returning them to the Command Module. The LM consisted of the small Ascent Stage on the top that included the crew quarters and all their equipment, and the larger Descent Stage that included the descent engine and landing legs, and larger water and oxygen tanks and batteries for storing electric power. In order to save weight, the Descent Stage was designed to be left on the lunar surface when the crew returned to lunar orbit. </p>
<p> After the onboard explosion disabled the CSM, the LM was used as a lifeboat to keep the crew alive. They had to make the LM's supply of oxygen, water and battery power last four days in deep space, instead of the designed 2-day, 2-man lunar landing mission. Instead of being used to descend to the lunar surface, the LM engine was fired to speed up the crew's return to Earth and later to course correct. The LM's batteries were used to recharge the Command Module's batteries that were needed to enable the computer and thrusters to operate during reentry, and enable the pyros to fire that opened the parachutes after reentry. </p>
</div>
</article>
  `;
  const video = host.querySelector<HTMLVideoElement>("video");
  const status = host.querySelector<HTMLElement>(".spacecraft-panel__media-status");
  // Marking the property as well as the attribute keeps autoplay muted in all browsers.
  if (video) video.muted = true;
  const showError = (): void => {
    if (status) status.hidden = false;
  };
  video?.addEventListener("error", showError);
  video?.querySelector("source")?.addEventListener("error", showError);
  let destroyed = false;
  return {
    setVisible(visible) {
      if (destroyed) return;
      host.hidden = !visible;
      if (!video) return;
      if (visible && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void video.play().catch(() => {
          /* Native controls remain available if autoplay is blocked. */
        });
      } else video.pause();
    },
    destroy() {
      destroyed = true;
      video?.pause();
      video?.removeEventListener("error", showError);
      video?.querySelector("source")?.removeEventListener("error", showError);
      video?.removeAttribute("src");
      video?.replaceChildren();
      video?.load();
      host.replaceChildren();
      host.classList.remove("spacecraft-panel");
    },
  };
}
