import { useEffect } from "react";
import { channelsFor, type MissionChannels } from "./channels.js";
import type { MocrMissionId } from "./urls.js";
import { useMissionStore } from "../../store/missionStore.js";
import { useMocrHover } from "./hoverStore.js";
import { useChannelActivity } from "./queries.js";
import layout from "../../styles/base.module.css";
import controls from "../../styles/controls.module.css";
import { cx } from "../../styles/classNames.js";

/** Always mounted by the shell; the expensive room and recordings load on first opening. */
export function ChannelStrip({ config }: { config: MissionConfig }) {
  const catalog = channelsFor(config.id);
  return catalog && (config.id === "11" || config.id === "13") ? (
    <ChannelButtons config={config} mission={config.id} catalog={catalog} />
  ) : null;
}

function ChannelButtons({
  config,
  mission,
  catalog,
}: {
  config: MissionConfig;
  mission: MocrMissionId;
  catalog: MissionChannels;
}) {
  const seconds = useMissionStore((state) => Math.floor(state.seconds));
  const channel = useMissionStore((state) => state.selectedChannel) ?? catalog.defaultChannel;
  const rightTab = useMissionStore((state) => state.rightTab);
  const selectChannel = useMissionStore((state) => state.selectChannel);
  const hovered = useMocrHover((state) => state.channel);
  const hover = useMocrHover((state) => state.setChannel);
  const activity = useChannelActivity(mission, `${config.mediaRoot}/MOCR_audio`, seconds);
  const speaking = activity.at(seconds);
  useEffect(
    () => () => {
      hover(null);
    },
    [hover, mission],
  );
  return (
    <>
      {catalog.available.map((id) => {
        const info = catalog.all.find((entry) => entry.id === id);
        if (!info) return null;
        const selected = channel === id && rightTab === "mocr";
        return (
          <button
            key={id}
            type="button"
            id={`btn-ch${String(id)}`}
            className={cx(
              layout.thirtybtnChannel,
              controls.thirtybtnChannel,
              selected && layout.isActive,
              speaking?.includes(id) && layout.isSpeaking,
              hovered === id && layout.isHovered,
            )}
            title={`${info.label}: ${info.description}`}
            aria-pressed={selected}
            data-speaking={speaking?.includes(id) ?? undefined}
            data-hovered={hovered === id || undefined}
            onClick={() => {
              selectChannel(id);
            }}
            onPointerEnter={() => {
              hover(id);
            }}
            onPointerLeave={() => {
              hover(null);
            }}
            onFocus={() => {
              hover(id);
            }}
            onBlur={() => {
              hover(null);
            }}
          >
            {info.label}
          </button>
        );
      })}
    </>
  );
}
