// Typed fetchers keep the existing CSV adapters and mission-specific parsing.
import { loadUtteranceData } from "../data/utteranceData.js";
import { loadTocData } from "../data/tocData.js";
import { loadCommentaryData } from "../data/commentaryData.js";
import { loadPhotoData } from "../data/photoData.js";
import { loadMissionStagesData } from "../data/missionStagesData.js";
import { loadCrewStatusData } from "../data/crewStatusData.js";
import { loadTelemetryData } from "../data/telemetryData.js";
import { loadOrbitData } from "../data/orbitData.js";
import { loadVideoUrlData } from "../data/videoUrlData.js";
import { loadVideoSegmentData } from "../data/videoSegmentData.js";
export const fetchUtteranceData = (config: MissionConfig) => loadUtteranceData(`/${config.id}/`);
export const fetchTocData = (config: MissionConfig) => loadTocData(`/${config.id}/`);
export const fetchCommentaryData = (config: MissionConfig) => loadCommentaryData(`/${config.id}/`);
export const fetchPhotoData = (config: MissionConfig) => loadPhotoData(`/${config.id}/`);
export const fetchMissionStagesData = (config: MissionConfig) =>
  loadMissionStagesData(`/${config.id}/`, {
    missionDurationSeconds: config.missionDurationSeconds,
  });
export const fetchCrewStatusData = (config: MissionConfig) =>
  loadCrewStatusData(`/${config.id}/`, { missionDurationSeconds: config.missionDurationSeconds });
export const fetchTelemetryData = (config: MissionConfig) =>
  loadTelemetryData(`/${config.id}/`, { missionDurationSeconds: config.missionDurationSeconds });
export const fetchOrbitData = (config: MissionConfig) => loadOrbitData(`/${config.id}/`);
export const fetchVideoUrlData = (config: MissionConfig) => loadVideoUrlData(`/${config.id}/`);
export const fetchVideoSegmentData = (config: MissionConfig) =>
  loadVideoSegmentData(`/${config.id}/`);
