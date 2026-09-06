import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import { loadTapeRangesData } from "../../data/tapeRangesData.js";
import {
  activityChunks,
  parseActivity,
  parseChannelTranscript,
  parseWaveform,
  type ActivityChunk,
} from "./data.js";
import { waveformDataUrl, type MocrMissionId } from "./urls.js";

async function recordingResponse(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Recording request failed (${String(response.status)})`);
  return response;
}

export function channelActivityOptions(mission: MocrMissionId, root: string, chunk: ActivityChunk) {
  return queryOptions({
    queryKey: ["mocr", mission, root, "activity", chunk.start],
    queryFn: async ({ signal }) => {
      const response = await recordingResponse(`${root}/tape_activity/${chunk.filename}`, signal);
      const json: unknown = await response.json();
      return parseActivity(json);
    },
    staleTime: Infinity,
    gcTime: 60_000,
    retry: false,
    refetchInterval: (query) => (query.state.status === "error" ? 60_000 : false),
  });
}

/** Query keys include the mission and recording: seeking never displays another tape's data.
 * The strip and timeline subscribe to the same cache; inactive chunks expire after a minute. */
export function useChannelActivity(
  mission: MocrMissionId,
  root: string,
  seconds: number,
  halfWindow = 0,
) {
  const chunks = activityChunks(mission, seconds, halfWindow);
  const results = useQueries({
    queries: chunks.map((chunk) => channelActivityOptions(mission, root, chunk)),
  });
  const countdown = mission === "13" ? 127048 : 74768;
  return {
    at: (get: number): readonly number[] | undefined => {
      const index = Math.floor(get + countdown);
      const start = Math.floor(index / 1000) * 1000;
      return results[chunks.findIndex((chunk) => chunk.start === start)]?.data?.[index - start];
    },
    message:
      chunks.length === 0
        ? "No activity recording at this mission time"
        : results.some((result) => result.isError)
          ? "Some channel activity is unavailable"
          : results.every((result) => result.data !== undefined)
            ? ""
            : "Loading recorded channel activity…",
  };
}

export function useMocrTapes(mission: MocrMissionId) {
  return useQuery({
    queryKey: ["mocr", mission, "tapes"],
    queryFn: () => loadTapeRangesData(`/${mission}/`),
    staleTime: Infinity,
  });
}

export function useChannelTranscript(mission: MocrMissionId, root: string, channel: number) {
  return useQuery({
    queryKey: ["mocr", mission, root, "transcript", channel],
    queryFn: async ({ signal }) =>
      parseChannelTranscript(
        await (
          await recordingResponse(`${root}/transcripts/CH${String(channel)}_transcript.txt`, signal)
        ).text(),
      ),
    staleTime: Infinity,
  });
}

export function useRecordingWaveform(
  mission: MocrMissionId,
  root: string,
  channel: number,
  tape: TapeRange | null,
) {
  return useQuery({
    queryKey: ["mocr", mission, root, "waveform", tape?.tapeId, tape?.channelBank, channel],
    enabled: tape !== null && tape.tapeId !== "T999",
    queryFn: async ({ signal }) => {
      if (!tape) throw new Error("No recording selected");
      const response = await recordingResponse(
        waveformDataUrl(root, mission, tape.tapeId, tape.channelBank, channel),
        signal,
      );
      return parseWaveform(await response.arrayBuffer());
    },
    staleTime: Infinity,
    gcTime: 60_000,
  });
}
