import { useQuery } from "@tanstack/react-query";
import * as fetchers from "./dataFetchers.js";

// Query keys include mission identity, so navigation cannot reuse another mission's data.
export function useUtteranceData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "utterance"],
    queryFn: () => fetchers.fetchUtteranceData(config),
  });
}
export function useTocData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "toc"],
    queryFn: () => fetchers.fetchTocData(config),
  });
}
export function useCommentaryData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "commentary"],
    queryFn: () => fetchers.fetchCommentaryData(config),
  });
}
export function usePhotoData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "photo"],
    queryFn: () => fetchers.fetchPhotoData(config),
  });
}
export function useMissionStagesData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "missionStages"],
    queryFn: () => fetchers.fetchMissionStagesData(config),
  });
}
export function useCrewStatusData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "crewStatus"],
    queryFn: () => fetchers.fetchCrewStatusData(config),
  });
}
export function useTelemetryData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "telemetry"],
    queryFn: () => fetchers.fetchTelemetryData(config),
  });
}
export function useOrbitData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "orbit"],
    queryFn: () => fetchers.fetchOrbitData(config),
  });
}
export function useVideoUrlData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "videoUrl"],
    queryFn: () => fetchers.fetchVideoUrlData(config),
  });
}
export function useVideoSegmentData(config: MissionConfig) {
  return useQuery({
    queryKey: ["mission", config.id, "videoSegment"],
    queryFn: () => fetchers.fetchVideoSegmentData(config),
  });
}
