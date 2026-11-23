import { useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { EMOTIONS, STYLES, VOICES } from "../data/studioCatalog";
import { EmotionId, GeneratedTake, SceneItem, StudioState, VocalStyleId } from "../types";
import {
  analyzeScriptIntoScenes,
  generateLongNarration,
  requestDualDialogue,
  requestSingleAudio,
} from "../services/studioApi";
import {
  analyzePcmQuality,
  concatenatePcmClips,
  parseAudioBase64,
  pcmInt16ToWavBlob,
  processStudioPcm,
} from "../utils/audioUtils";
import {
  parseDialogueLines,
  stripSpeakerLabels,
  stripStageDirectionsFromText,
} from "../utils/scriptUtils";

interface UseAudioGenerationArgs {
  stateRef: MutableRefObject<StudioState>;
  setState: Dispatch<SetStateAction<StudioState>>;
  setTakes: Dispatch<SetStateAction<GeneratedTake[]>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  updateScene: (sceneId: string, patch: Partial<SceneItem>) => void;
  playTakeInMaster: (take: GeneratedTake, autoPlay?: boolean) => void;
}

export function useAudioGeneration({
  stateRef,
  setState,
  setTakes,
  setErrorMessage,
  updateScene,
  playTakeInMaster,
}: UseAudioGenerationArgs) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("Generando…");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeScenes = async () => {
    const source = stateRef.current.script.trim() || stateRef.current.dialogueScript.trim();
    if (!source) {
      setErrorMessage("Escribe un guion en la pestaña Narración antes de analizarlo.");
      return;
    }
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const rawScenes = await analyzeScriptIntoScenes(source);
      const validStyles = STYLES.map((s) => s.id);
      const validEmotions = EMOTIONS.map((e) => e.id);
      const speakerVoices = new Map<string, string>();
      const voicePool = [
        stateRef.current.voiceId,
        ...VOICES.map((v) => v.id).filter((id) => id !== stateRef.current.voiceId),
      ];

      setState((prev) => {
        prev.scenes.forEach((s) => s.audioWavUrl && URL.revokeObjectURL(s.audioWavUrl));
        const mapped: SceneItem[] = rawScenes.map((s, idx) => {
          const sp = s.speaker.trim() || "Narrador";
          if (!speakerVoices.has(sp)) {
            speakerVoices.set(sp, voicePool[speakerVoices.size % voicePool.length]);
          }
          return {
            id: `sc_${Date.now()}_${idx}`,
            title: s.title || `Escena ${idx + 1}`,
            speaker: sp,
            voiceId: speakerVoices.get(sp) || prev.voiceId,
            text: s.text,
            styleId: validStyles.includes(s.styleId as VocalStyleId)
              ? (s.styleId as VocalStyleId)
              : prev.styleId,
            emotionId: validEmotions.includes(s.emotionId as EmotionId)
              ? (s.emotionId as EmotionId)
              : prev.emotionId,
            pauseAfterMs: s.pauseAfterMs,
            status: "idle",
          };
        });
        return { ...prev, scenes: mapped };
      });
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudo analizar el guion.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySceneAudioSafely = (
    sceneId: string,
    snapshot: { text: string; voiceId: string; styleId: VocalStyleId; emotionId: EmotionId },
    audio: { wavUrl: string; rawBase64: string; quality: SceneItem["quality"] }
  ) => {
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        // Guard against concurrent user edits while this clip was generating
        const unchanged =
          s.text === snapshot.text &&
          s.voiceId === snapshot.voiceId &&
          s.styleId === snapshot.styleId &&
          s.emotionId === snapshot.emotionId;
        if (!unchanged) {
          URL.revokeObjectURL(audio.wavUrl);
          return s;
        }
        if (s.audioWavUrl) URL.revokeObjectURL(s.audioWavUrl);
        return {
          ...s,
          status: "ready",
          errorMessage: undefined,
          audioWavUrl: audio.wavUrl,
          audioWavBase64: audio.rawBase64,
          quality: audio.quality,
        };
      }),
    }));
  };

  const handleGenerateScene = async (sceneId: string) => {
    const target = stateRef.current.scenes.find((s) => s.id === sceneId);
    if (!target || !target.text.trim()) return;

    const snap = {
      text: target.text,
      voiceId: target.voiceId,
      styleId: target.styleId,
      emotionId: target.emotionId,
    };

    updateScene(sceneId, { status: "generating", errorMessage: undefined });
    setErrorMessage(null);

    try {
      const res = await requestSingleAudio(stateRef.current, {
        text: snap.text,
        voiceId: snap.voiceId,
        styleId: snap.styleId,
        emotionId: snap.emotionId,
        addMargins: false,
      });
      applySceneAudioSafely(sceneId, snap, res);
    } catch (err: any) {
      updateScene(sceneId, {
        status: "error",
        errorMessage: err.message || "Error al generar esta escena.",
      });
    }
  };

  const handleGenerateMain = async () => {
    const snap = stateRef.current;
    setErrorMessage(null);
    setIsGenerating(true);
    setGenStatus("Generando…");

    try {
      const styleName = STYLES.find((s) => s.id === snap.styleId)?.name || "Narrador";

      if (snap.mode === "narration") {
        if (!snap.script.trim()) throw new Error("Escribe o pega un guion antes de generar.");
        const res = await generateLongNarration(snap, snap.script, (cur, tot) => {
          setGenStatus(tot > 1 ? `Generando fragmento ${cur} de ${tot}…` : "Generando…");
        });

        const cleanForQa = snap.stripStageDirections
          ? stripStageDirectionsFromText(snap.script)
          : snap.script.trim();

        const take: GeneratedTake = {
          id: `take_${Date.now()}`,
          title: "Narración",
          mode: "narration",
          voiceSummary: snap.voiceId,
          styleName,
          textForQa: cleanForQa,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          durationSec: res.quality.durationSec,
          sampleRate: res.sampleRate,
          modelUsed: res.quality.modelUsed,
          quality: res.quality,
          wavUrl: res.wavUrl,
          wavBlob: res.wavBlob,
        };
        setTakes((prev) => [take, ...prev]);
        playTakeInMaster(take, true);
        return;
      }

      if (snap.mode === "dialogue") {
        const sp1 = snap.speaker1Name.trim();
        const sp2 = snap.speaker2Name.trim();
        if (!sp1 || !sp2 || sp1 === sp2) {
          throw new Error("Escribe dos nombres de personaje distintos para el diálogo.");
        }
        const turns = parseDialogueLines(snap.dialogueScript, sp1, sp2);
        if (turns.length === 0) {
          throw new Error("Escribe al menos una línea con formato Nombre: texto.");
        }

        const res = await requestDualDialogue(
          snap,
          [
            { speaker: sp1, voiceId: snap.speaker1Voice.trim() },
            { speaker: sp2, voiceId: snap.speaker2Voice.trim() },
          ],
          turns
        );

        // Strip "Nombre: " prefixes so transcription QA compares only spoken words
        const qaExpected = stripSpeakerLabels(
          turns
            .map((t) =>
              snap.stripStageDirections ? stripStageDirectionsFromText(t.text) : t.text
            )
            .join("\n")
        );

        const take: GeneratedTake = {
          id: `take_${Date.now()}`,
          title: `Diálogo ${sp1} y ${sp2}`,
          mode: "dialogue",
          voiceSummary: `${sp1} (${snap.speaker1Voice}) y ${sp2} (${snap.speaker2Voice})`,
          styleName,
          textForQa: qaExpected,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          durationSec: res.quality.durationSec,
          sampleRate: res.sampleRate,
          modelUsed: res.quality.modelUsed,
          quality: res.quality,
          wavUrl: res.wavUrl,
          wavBlob: res.wavBlob,
        };
        setTakes((prev) => [take, ...prev]);
        playTakeInMaster(take, true);
        return;
      }

      // MODE: Scenes — generate pending clips safely by ID and concatenate into master
      const sceneIds = snap.scenes.map((s) => s.id);
      if (sceneIds.length === 0) {
        throw new Error("Agrega al menos una escena o analiza tu guion con IA.");
      }

      const clips: Array<{ samples: Int16Array; pauseAfterMs: number; spoken: string; voice: string }> =
        [];
      let sampleRate = 24000;
      let channels = 1;
      let bitDepth = 16;

      for (let i = 0; i < sceneIds.length; i++) {
        const id = sceneIds[i];
        const liveScene = stateRef.current.scenes.find((s) => s.id === id);
        if (!liveScene || !liveScene.text.trim()) continue;

        setGenStatus(`Escena ${i + 1} de ${sceneIds.length}…`);

        if (liveScene.status === "ready" && liveScene.audioWavBase64) {
          const parsed = parseAudioBase64(liveScene.audioWavBase64, sampleRate);
          const cleaned = processStudioPcm(parsed.samples, parsed.sampleRate, {
            normalize: stateRef.current.normalizeOutput,
            trimDeadSilence: true,
          });
          sampleRate = parsed.sampleRate;
          channels = parsed.channels;
          bitDepth = parsed.bitDepth;
          clips.push({
            samples: cleaned,
            pauseAfterMs: liveScene.pauseAfterMs,
            spoken: liveScene.text,
            voice: liveScene.voiceId,
          });
          continue;
        }

        const sceneSnap = {
          text: liveScene.text,
          voiceId: liveScene.voiceId,
          styleId: liveScene.styleId,
          emotionId: liveScene.emotionId,
        };
        updateScene(id, { status: "generating", errorMessage: undefined });
        try {
          const res = await requestSingleAudio(stateRef.current, {
            ...sceneSnap,
            addMargins: false,
          });
          sampleRate = res.sampleRate;
          channels = res.channels;
          bitDepth = res.bitDepth;
          applySceneAudioSafely(id, sceneSnap, res);
          clips.push({
            samples: res.samples,
            pauseAfterMs: liveScene.pauseAfterMs,
            spoken: sceneSnap.text,
            voice: sceneSnap.voiceId,
          });
        } catch (clipErr: any) {
          updateScene(id, { status: "error", errorMessage: clipErr.message });
          throw new Error(`Falló "${liveScene.title}": ${clipErr.message}`);
        }
      }

      if (clips.length === 0) throw new Error("No hubo escenas con texto para unir.");

      const masterPcm = concatenatePcmClips(
        clips.map((c) => ({ samples: c.samples, pauseAfterMs: c.pauseAfterMs })),
        sampleRate,
        stateRef.current.leadInSilenceMs,
        stateRef.current.leadOutSilenceMs
      );
      const wavBlob = pcmInt16ToWavBlob(masterPcm, sampleRate, channels);
      const wavUrl = URL.createObjectURL(wavBlob);
      const quality = analyzePcmQuality(
        masterPcm,
        sampleRate,
        channels,
        bitDepth,
        stateRef.current.ttsModel
      );
      const voices = Array.from(new Set(clips.map((c) => c.voice)));

      const take: GeneratedTake = {
        id: `take_${Date.now()}`,
        title: `Master (${clips.length} escenas)`,
        mode: "scenes",
        voiceSummary: voices.join(", "),
        styleName: `${clips.length} escenas unidas`,
        textForQa: clips
          .map((c) =>
            stateRef.current.stripStageDirections
              ? stripStageDirectionsFromText(c.spoken)
              : c.spoken
          )
          .join(" "),
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationSec: quality.durationSec,
        sampleRate,
        modelUsed: quality.modelUsed,
        quality,
        wavUrl,
        wavBlob,
      };
      setTakes((prev) => [take, ...prev]);
      playTakeInMaster(take, true);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al generar el audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    genStatus,
    isAnalyzing,
    handleAnalyzeScenes,
    handleGenerateScene,
    handleGenerateMain,
  };
}
