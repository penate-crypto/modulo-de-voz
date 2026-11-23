import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Header, StudioTab } from "./components/Header";
import { StudioSidebar } from "./components/StudioSidebar";
import { ScriptDirectorView } from "./components/ScriptDirectorView";
import { ScenesTimelineView } from "./components/ScenesTimelineView";
import { GlossaryAndQaView } from "./components/GlossaryAndQaView";
import { TakeHistoryView } from "./components/TakeHistoryView";
import { MasterAudioDeck } from "./components/MasterAudioDeck";
import { CapabilitiesModal } from "./components/CapabilitiesModal";
import {
  DEFAULT_GLOSSARY,
  EMOTIONS,
  PAUSE_STYLES,
  PRODUCTION_MODES,
  REGIONAL_VARIANTS,
  STUDIO_TEMPLATES,
  VOCAL_STYLES,
  VOICE_MODELS,
} from "./data/studioCatalog";
import {
  BackendCapabilities,
  CharacterCast,
  EmotionId,
  EmotionIntensity,
  GeneratedTake,
  PauseStyleId,
  ProductionModeId,
  ScriptSegment,
  StudioProject,
  StudioTemplate,
  VocalStyleId,
} from "./types";
import {
  analyzePcmQuality,
  blobToBase64,
  buildProjectFilename,
  concatenatePcmClips,
  downloadBlob,
  extractWaveformPeaks,
  parseAudioBase64,
  pcmInt16ToMp3Blob,
  pcmInt16ToWavBlob,
  processStudioPcm,
  stripStageDirectionsFromText,
} from "./utils/audioUtils";

const PROJECTS_STORAGE_KEY = "vozescena_projects_v1";
const TAKES_STORAGE_KEY = "vozescena_takes_v1";

function createDefaultProject(template?: StudioTemplate, index = 1): StudioProject {
  const tpl = template || STUDIO_TEMPLATES[0];
  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: template ? template.title : `Proyecto ${index} — Circuito eléctrico`,
    updatedAt: new Date().toISOString(),
    modeId: tpl.modeId,
    engineModel: "gemini-3.8-flash-tts",
    regionalVariant: "es_latam_sv",
    primaryVoiceId: tpl.primaryVoiceId,
    vocalStyle: tpl.vocalStyle,
    emotion: tpl.emotion,
    emotionIntensity: tpl.emotionIntensity,
    pauseStyle: tpl.pauseStyle,
    speed: 1.0,
    targetDurationSec: tpl.targetDurationSec,
    leadInSilenceMs: 150,
    leadOutSilenceMs: 300,
    allowSubtleBreath: false,
    normalizeOutput: true,
    stripStageDirections: true,
    useNativeDualSpeaker: true,
    rawScript: tpl.script,
    cast: tpl.suggestedCast ? [...tpl.suggestedCast] : [],
    glossary: DEFAULT_GLOSSARY.map((g) => ({ ...g })),
    segments: [],
    analysis: null,
  };
}

function sanitizeEnum<T extends string>(val: string, validList: readonly T[], fallback: T): T {
  return (validList as readonly string[]).includes(val) ? (val as T) : fallback;
}

export function App() {
  // Projects state
  const [projects, setProjects] = useState<StudioProject[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore corrupt storage
    }
    return [createDefaultProject(STUDIO_TEMPLATES[0], 1)];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => projects[0]?.id || ""
  );
  const [activeTab, setActiveTab] = useState<StudioTab>("script");

  // Audio takes & playback state
  const [takes, setTakes] = useState<GeneratedTake[]>(() => {
    try {
      const saved = localStorage.getItem(TAKES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [currentTakeId, setCurrentTakeId] = useState<string | null>(null);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Loading & feedback state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifyingQa, setIsVerifyingQa] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<BackendCapabilities | null>(null);
  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];
  const currentTake = takes.find((t) => t.id === currentTakeId) || null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 3600);
  };

  // Fetch honest backend capabilities once on startup
  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCapabilities(data);
      })
      .catch(() => {});
  }, []);

  // Persist lightweight project data (excluding large base64/blob buffers)
  useEffect(() => {
    try {
      const serializable = projects.map((p) => ({
        ...p,
        segments: p.segments.map((s) => ({
          ...s,
          status: "idle" as const,
          audioWavUrl: undefined,
          audioWavBase64: undefined,
          waveformPeaks: undefined,
        })),
      }));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore quota errors
    }
  }, [projects]);

  useEffect(() => {
    try {
      const serializableTakes = takes.slice(0, 30).map((t) => ({
        ...t,
        wavUrl: undefined,
        wavBlob: undefined,
        mp3Blob: undefined,
      }));
      localStorage.setItem(TAKES_STORAGE_KEY, JSON.stringify(serializableTakes));
    } catch {
      // Ignore
    }
  }, [takes]);

  // Project helpers
  const updateActiveProject = (patch: Partial<StudioProject>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const handleCreateProject = () => {
    const newProj = createDefaultProject(
      {
        ...STUDIO_TEMPLATES[0],
        title: `Nuevo proyecto ${projects.length + 1}`,
        script: "",
        targetDurationSec: null,
      },
      projects.length + 1
    );
    newProj.name = `Proyecto ${projects.length + 1}`;
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveTab("script");
    showToast("Nuevo proyecto creado.");
  };

  const handleRenameProject = (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    if (activeProjectId === id) {
      setActiveProjectId(next[0].id);
    }
    showToast("Proyecto eliminado.");
  };

  const handleSelectMode = (modeId: ProductionModeId) => {
    const mode = PRODUCTION_MODES.find((m) => m.id === modeId);
    if (!mode) return;
    updateActiveProject({
      modeId: mode.id,
      vocalStyle: mode.defaultStyle,
      emotion: mode.defaultEmotion,
      emotionIntensity: mode.defaultIntensity,
      pauseStyle: mode.defaultPauseStyle,
      speed: mode.defaultSpeed,
      engineModel: mode.defaultEngine,
    });
    showToast(`${mode.code}: ${mode.name} aplicado.`);
  };

  const handleApplyTemplate = (tpl: StudioTemplate) => {
    updateActiveProject({
      name: tpl.title,
      modeId: tpl.modeId,
      vocalStyle: tpl.vocalStyle,
      emotion: tpl.emotion,
      emotionIntensity: tpl.emotionIntensity,
      pauseStyle: tpl.pauseStyle,
      primaryVoiceId: tpl.primaryVoiceId,
      targetDurationSec: tpl.targetDurationSec,
      rawScript: tpl.script,
      cast: tpl.suggestedCast ? [...tpl.suggestedCast] : [],
      segments: [],
      analysis: null,
    });
    setErrorBanner(null);
    showToast(`Plantilla cargada: ${tpl.testBadge} — ${tpl.title}`);
  };

  // Segment helpers
  const updateSegment = (segmentId: string, patch: Partial<ScriptSegment>) => {
    updateActiveProject({
      segments: activeProject.segments.map((s) =>
        s.id === segmentId ? { ...s, ...patch } : s
      ),
    });
  };

  const handleAddSegment = () => {
    const nextOrder = activeProject.segments.length + 1;
    const newSeg: ScriptSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: nextOrder,
      sceneLabel: `Escena ${nextOrder}`,
      speaker: activeProject.cast[0]?.speaker || "Narrador",
      voiceId: activeProject.cast[0]?.voiceId || activeProject.primaryVoiceId,
      originalText: "",
      adaptedText: "",
      useAdapted: false,
      vocalStyle: activeProject.vocalStyle,
      emotion: activeProject.emotion,
      emotionIntensity: activeProject.emotionIntensity,
      pauseStyle: activeProject.pauseStyle,
      pauseAfterMs: 450,
      emphasisWords: [],
      stageDirections: [],
      status: "idle",
    };
    updateActiveProject({ segments: [...activeProject.segments, newSeg] });
  };

  const handleMoveSegment = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= activeProject.segments.length) return;
    const copy = [...activeProject.segments];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    updateActiveProject({
      segments: copy.map((s, idx) => ({ ...s, order: idx + 1 })),
    });
  };

  const handleDeleteSegment = (segmentId: string) => {
    updateActiveProject({
      segments: activeProject.segments
        .filter((s) => s.id !== segmentId)
        .map((s, idx) => ({ ...s, order: idx + 1 })),
    });
  };

  const handleUpdateCastVoice = (speaker: string, voiceId: string) => {
    const existingCast = activeProject.cast.some((c) => c.speaker === speaker)
      ? activeProject.cast.map((c) => (c.speaker === speaker ? { ...c, voiceId } : c))
      : [
          ...activeProject.cast,
          {
            speaker,
            voiceId,
            defaultStyle: activeProject.vocalStyle,
            characterNote: "",
          },
        ];

    const updatedSegments = activeProject.segments.map((seg) =>
      seg.speaker === speaker ? { ...seg, voiceId } : seg
    );

    updateActiveProject({
      cast: existingCast,
      segments: updatedSegments,
    });
    showToast(`Voz de ${speaker} fijada en ${voiceId} para todo el proyecto.`);
  };

  // 1. Intelligent Script Analysis (gemini-4-hydrogen)
  const handleAnalyzeScript = async () => {
    if (!activeProject.rawScript.trim()) return;
    setIsAnalyzing(true);
    setErrorBanner(null);

    try {
      const response = await fetch("/api/analyze-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: activeProject.rawScript,
          modeId: activeProject.modeId,
          targetDurationSec: activeProject.targetDurationSec,
          regionalVariant: activeProject.regionalVariant,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo analizar el guion.");
      }

      const validStyles = VOCAL_STYLES.map((s) => s.id);
      const validEmotions = EMOTIONS.map((e) => e.id);
      const validPauses = PAUSE_STYLES.map((p) => p.id);
      const validIntensities: EmotionIntensity[] = ["sutil", "moderada", "marcada"];

      // Assign distinct consistent voices per detected speaker
      const speakerVoiceMap = new Map<string, string>();
      activeProject.cast.forEach((c) => speakerVoiceMap.set(c.speaker, c.voiceId));

      const fallbackPool = [
        activeProject.primaryVoiceId,
        ...VOICE_MODELS.map((v) => v.id).filter((id) => id !== activeProject.primaryVoiceId),
      ];
      let poolCursor = 0;

      const speakers: string[] = data.analysis?.detectedSpeakers || ["Narrador"];
      const nextCast: CharacterCast[] = speakers.map((sp) => {
        let assigned = speakerVoiceMap.get(sp);
        if (!assigned) {
          assigned = fallbackPool[poolCursor % fallbackPool.length];
          poolCursor++;
          speakerVoiceMap.set(sp, assigned);
        }
        const existing = activeProject.cast.find((c) => c.speaker === sp);
        return (
          existing || {
            speaker: sp,
            voiceId: assigned,
            defaultStyle: activeProject.vocalStyle,
            characterNote: "",
          }
        );
      });

      const mappedSegments: ScriptSegment[] = (data.segments || []).map(
        (seg: any, idx: number) => {
          const speakerName = String(seg.speaker || "Narrador").trim();
          const voiceForSpeaker =
            speakerVoiceMap.get(speakerName) || activeProject.primaryVoiceId;
          return {
            id: `seg_${Date.now()}_${idx}`,
            order: idx + 1,
            sceneLabel: String(seg.sceneLabel || `Escena ${idx + 1}`),
            speaker: speakerName,
            voiceId: voiceForSpeaker,
            originalText: String(seg.originalText || "").trim(),
            adaptedText: String(seg.adaptedText || seg.originalText || "").trim(),
            useAdapted: false,
            vocalStyle: sanitizeEnum<VocalStyleId>(
              String(seg.vocalStyle || ""),
              validStyles,
              activeProject.vocalStyle
            ),
            emotion: sanitizeEnum<EmotionId>(
              String(seg.emotion || ""),
              validEmotions,
              activeProject.emotion
            ),
            emotionIntensity: sanitizeEnum<EmotionIntensity>(
              String(seg.emotionIntensity || ""),
              validIntensities,
              activeProject.emotionIntensity
            ),
            pauseStyle: sanitizeEnum<PauseStyleId>(
              String(seg.pauseStyle || ""),
              validPauses,
              activeProject.pauseStyle
            ),
            pauseAfterMs: Math.max(0, Math.min(3500, Number(seg.pauseAfterMs) || 400)),
            emphasisWords: Array.isArray(seg.emphasisWords) ? seg.emphasisWords : [],
            stageDirections: Array.isArray(seg.stageDirections) ? seg.stageDirections : [],
            visualSyncNote: seg.visualSyncNote ? String(seg.visualSyncNote) : undefined,
            status: "idle",
          };
        }
      );

      updateActiveProject({
        analysis: data.analysis,
        cast: nextCast,
        segments: mappedSegments,
      });

      showToast(
        `Guion dirigido: ${mappedSegments.length} escena(s) y ${nextCast.length} voz(ces) organizadas.`
      );
      if (mappedSegments.length > 1) {
        setActiveTab("scenes");
      }
    } catch (err: any) {
      setErrorBanner(err.message || "Error al analizar el guion.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to resolve direction cues from catalog
  const getDirectionCues = (
    styleId: VocalStyleId,
    emotionId: EmotionId,
    pauseId: PauseStyleId
  ) => {
    const modeObj =
      PRODUCTION_MODES.find((m) => m.id === activeProject.modeId) || PRODUCTION_MODES[0];
    const regionalObj =
      REGIONAL_VARIANTS.find((r) => r.id === activeProject.regionalVariant) ||
      REGIONAL_VARIANTS[0];
    const styleObj = VOCAL_STYLES.find((s) => s.id === styleId) || VOCAL_STYLES[0];
    const emotionObj = EMOTIONS.find((e) => e.id === emotionId) || EMOTIONS[0];
    const pauseObj = PAUSE_STYLES.find((p) => p.id === pauseId) || PAUSE_STYLES[0];
    return { modeObj, regionalObj, styleObj, emotionObj, pauseObj };
  };

  // Low-level API call for a single text clip -> returns parsed PCM + WAV blob + quality
  const synthesizeClip = async (params: {
    text: string;
    voiceId: string;
    styleId: VocalStyleId;
    emotionId: EmotionId;
    intensity: EmotionIntensity;
    pauseId: PauseStyleId;
    emphasisWords?: string[];
    stageDirections?: string[];
    continuityContext?: string;
  }) => {
    const { modeObj, regionalObj, styleObj, emotionObj, pauseObj } = getDirectionCues(
      params.styleId,
      params.emotionId,
      params.pauseId
    );

    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: params.text,
        voice: params.voiceId,
        engineModel: activeProject.engineModel,
        regionalCue: regionalObj.directionCue,
        modeDirection: modeObj.directionPrompt,
        styleCue: styleObj.directionCue,
        emotionName: emotionObj.name,
        emotionNuanceCue: emotionObj.nuanceCue,
        intensity: params.intensity,
        pauseCue: pauseObj.cue,
        speed: activeProject.speed,
        emphasisWords: params.emphasisWords || [],
        stageDirections: params.stageDirections || [],
        continuityContext: params.continuityContext || "",
        allowSubtleBreath: activeProject.allowSubtleBreath,
        stripStageDirections: activeProject.stripStageDirections,
        glossary: activeProject.glossary,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success || !data.audioBase64) {
      throw new Error(data.error || "El servidor no devolvió audio válido.");
    }

    const parsed = parseAudioBase64(data.audioBase64, data.sampleRate || 24000);
    const processedSamples = processStudioPcm(parsed.samples, parsed.sampleRate, {
      normalize: activeProject.normalizeOutput,
      trimDeadSilence: true,
    });

    const wavBlob = pcmInt16ToWavBlob(processedSamples, parsed.sampleRate, parsed.channels);
    const wavUrl = URL.createObjectURL(wavBlob);
    const waveformPeaks = extractWaveformPeaks(processedSamples, 48);
    const quality = analyzePcmQuality(
      processedSamples,
      parsed.sampleRate,
      parsed.channels,
      parsed.bitDepth,
      data.quality?.modelUsed || activeProject.engineModel
    );

    return {
      samples: processedSamples,
      sampleRate: parsed.sampleRate,
      channels: parsed.channels,
      bitDepth: parsed.bitDepth,
      wavBlob,
      wavUrl,
      rawBase64: data.audioBase64 as string,
      waveformPeaks,
      quality,
    };
  };

  // Load take into Master Audio Player
  const activateTake = (take: GeneratedTake, autoPlay = true) => {
    setCurrentTakeId(take.id);
    setDuration(take.durationSec);
    setCurrentTime(0);

    if (segmentAudioRef.current) {
      segmentAudioRef.current.pause();
      setPlayingSegmentId(null);
    }

    if (audioRef.current && take.wavUrl) {
      audioRef.current.src = take.wavUrl;
      audioRef.current.volume = isMuted ? 0 : volume;
      if (autoPlay) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  // Generate single segment inside ScenesTimelineView (allows isolated retry/regeneration!)
  const handleGenerateSingleSegment = async (segmentId: string) => {
    const idx = activeProject.segments.findIndex((s) => s.id === segmentId);
    if (idx < 0) return;
    const seg = activeProject.segments[idx];
    const spokenText = (seg.useAdapted ? seg.adaptedText : seg.originalText).trim();
    if (!spokenText) {
      updateSegment(segmentId, {
        status: "error",
        errorMessage: "Este fragmento no tiene texto para narrar.",
      });
      return;
    }

    updateSegment(segmentId, { status: "generating", errorMessage: undefined });
    setErrorBanner(null);

    try {
      const prevSeg = idx > 0 ? activeProject.segments[idx - 1] : null;
      const continuityContext = prevSeg
        ? `Continues naturally after previous scene (${prevSeg.speaker}, emotion: ${prevSeg.emotion})`
        : "Opening scene of the narrative";

      const result = await synthesizeClip({
        text: spokenText,
        voiceId: seg.voiceId,
        styleId: seg.vocalStyle,
        emotionId: seg.emotion,
        intensity: seg.emotionIntensity,
        pauseId: seg.pauseStyle,
        emphasisWords: seg.emphasisWords,
        stageDirections: seg.stageDirections,
        continuityContext,
      });

      updateSegment(segmentId, {
        status: "ready",
        errorMessage: undefined,
        audioWavUrl: result.wavUrl,
        audioWavBase64: result.rawBase64,
        waveformPeaks: result.waveformPeaks,
        quality: result.quality,
      });
      showToast(`Clip generado: ${seg.sceneLabel} (${result.quality.durationSec.toFixed(1)} s).`);
    } catch (err: any) {
      updateSegment(segmentId, {
        status: "error",
        errorMessage: err.message || "No se pudo generar este clip.",
      });
    }
  };

  // Native Dual-Speaker Generation (gemini-3.8-flash-tts multiSpeakerVoiceConfig)
  const generateNativeDualDialogue = async () => {
    const speakers = Array.from(
      new Set(activeProject.segments.map((s) => s.speaker.trim()).filter(Boolean))
    );
    if (speakers.length !== 2) {
      throw new Error("El modo de diálogo nativo requiere exactamente 2 personajes.");
    }

    const modeObj =
      PRODUCTION_MODES.find((m) => m.id === activeProject.modeId) || PRODUCTION_MODES[0];
    const regionalObj =
      REGIONAL_VARIANTS.find((r) => r.id === activeProject.regionalVariant) ||
      REGIONAL_VARIANTS[0];

    const speakerConfigs = speakers.map((sp) => {
      const castEntry = activeProject.cast.find((c) => c.speaker === sp);
      const segEntry = activeProject.segments.find((s) => s.speaker === sp);
      return {
        speaker: sp,
        voiceId: castEntry?.voiceId || segEntry?.voiceId || activeProject.primaryVoiceId,
      };
    });

    const turns = activeProject.segments.map((seg) => {
      const styleObj =
        VOCAL_STYLES.find((s) => s.id === seg.vocalStyle) || VOCAL_STYLES[0];
      const emotionObj =
        EMOTIONS.find((e) => e.id === seg.emotion) || EMOTIONS[0];
      const pauseObj =
        PAUSE_STYLES.find((p) => p.id === seg.pauseStyle) || PAUSE_STYLES[0];
      const castEntry = activeProject.cast.find((c) => c.speaker === seg.speaker);

      return {
        speaker: seg.speaker,
        text: seg.useAdapted ? seg.adaptedText : seg.originalText,
        styleCue: styleObj.directionCue,
        emotionName: emotionObj.name,
        emotionNuanceCue: emotionObj.nuanceCue,
        intensity: seg.emotionIntensity,
        pauseCue: pauseObj.cue,
        emphasisWords: seg.emphasisWords,
        stageDirections: seg.stageDirections,
        characterNote: castEntry?.characterNote || "",
      };
    });

    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engineModel: "gemini-3.8-flash-tts",
        regionalCue: regionalObj.directionCue,
        modeDirection: modeObj.directionPrompt,
        speed: activeProject.speed,
        allowSubtleBreath: activeProject.allowSubtleBreath,
        stripStageDirections: activeProject.stripStageDirections,
        glossary: activeProject.glossary,
        dualSpeakerDialogue: {
          speakers: speakerConfigs,
          turns,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.success || !data.audioBase64) {
      throw new Error(data.error || "Error al generar el diálogo de 2 voces.");
    }

    const parsed = parseAudioBase64(data.audioBase64, data.sampleRate || 24000);
    const processed = processStudioPcm(parsed.samples, parsed.sampleRate, {
      normalize: activeProject.normalizeOutput,
      trimDeadSilence: true,
    });
    const padded = concatenatePcmClips(
      [{ samples: processed, pauseAfterMs: 0 }],
      parsed.sampleRate,
      activeProject.leadInSilenceMs,
      activeProject.leadOutSilenceMs
    );

    const wavBlob = pcmInt16ToWavBlob(padded, parsed.sampleRate, parsed.channels);
    const wavUrl = URL.createObjectURL(wavBlob);
    const waveformPeaks = extractWaveformPeaks(padded, 48);
    const quality = analyzePcmQuality(
      padded,
      parsed.sampleRate,
      parsed.channels,
      parsed.bitDepth,
      "gemini-3.8-flash-tts"
    );

    const newTake: GeneratedTake = {
      id: `take_${Date.now()}`,
      projectId: activeProject.id,
      projectName: activeProject.name,
      filenameBase: "Dialogo_Master",
      modeName: modeObj.name,
      styleName: "Diálogo nativo (2 voces)",
      emotionSummary: "Progresión por intervención",
      voicesUsed: speakerConfigs.map((s) => `${s.speaker}: ${s.voiceId}`),
      segmentCount: activeProject.segments.length,
      textExcerpt: activeProject.segments
        .map((s) => `${s.speaker}: ${s.useAdapted ? s.adaptedText : s.originalText}`)
        .join(" "),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      durationSec: quality.durationSec,
      sampleRate: quality.sampleRate,
      bitDepth: quality.bitDepth,
      modelUsed: "gemini-3.8-flash-tts",
      quality,
      wavUrl,
      wavBlob,
      waveformPeaks,
      isDualNative: true,
    };

    setTakes((prev) => [newTake, ...prev]);
    activateTake(newTake, true);
    showToast(`Diálogo nativo generado (${quality.durationSec.toFixed(1)} s).`);
  };

  // Master Generation Handler (Single Script OR Multi-Scene Batch + Stitch OR Native Dual-Speaker)
  const handleGenerateMaster = async () => {
    setErrorBanner(null);

    // Case 1: Segments exist -> either Native 2-Speaker OR ordered clip-by-clip + stitch
    if (activeProject.segments.length > 0) {
      setIsGenerating(true);
      try {
        const uniqueSpeakers = Array.from(
          new Set(activeProject.segments.map((s) => s.speaker.trim()).filter(Boolean))
        );

        if (uniqueSpeakers.length === 2 && activeProject.useNativeDualSpeaker) {
          await generateNativeDualDialogue();
          return;
        }

        // Synthesize any pending or error segments in exact order, keeping already-ready clips intact
        const updatedSegments = [...activeProject.segments];
        const pcmClips: Array<{ samples: Int16Array; pauseAfterMs: number }> = [];
        let sampleRate = 24000;
        let channels = 1;
        let bitDepth = 16;

        for (let i = 0; i < updatedSegments.length; i++) {
          const seg = updatedSegments[i];
          const spoken = (seg.useAdapted ? seg.adaptedText : seg.originalText).trim();
          if (!spoken) continue;

          if (seg.status === "ready" && seg.audioWavBase64) {
            const parsed = parseAudioBase64(seg.audioWavBase64, sampleRate);
            const cleaned = processStudioPcm(parsed.samples, parsed.sampleRate, {
              normalize: activeProject.normalizeOutput,
              trimDeadSilence: true,
            });
            sampleRate = parsed.sampleRate;
            channels = parsed.channels;
            bitDepth = parsed.bitDepth;
            pcmClips.push({ samples: cleaned, pauseAfterMs: seg.pauseAfterMs });
            continue;
          }

          updatedSegments[i] = { ...seg, status: "generating", errorMessage: undefined };
          updateActiveProject({ segments: [...updatedSegments] });

          try {
            const prevSeg = i > 0 ? updatedSegments[i - 1] : null;
            const res = await synthesizeClip({
              text: spoken,
              voiceId: seg.voiceId,
              styleId: seg.vocalStyle,
              emotionId: seg.emotion,
              intensity: seg.emotionIntensity,
              pauseId: seg.pauseStyle,
              emphasisWords: seg.emphasisWords,
              stageDirections: seg.stageDirections,
              continuityContext: prevSeg
                ? `Follows scene "${prevSeg.sceneLabel}" (${prevSeg.emotion})`
                : "Opening scene",
            });

            sampleRate = res.sampleRate;
            channels = res.channels;
            bitDepth = res.bitDepth;

            updatedSegments[i] = {
              ...seg,
              status: "ready",
              audioWavUrl: res.wavUrl,
              audioWavBase64: res.rawBase64,
              waveformPeaks: res.waveformPeaks,
              quality: res.quality,
            };
            updateActiveProject({ segments: [...updatedSegments] });
            pcmClips.push({ samples: res.samples, pauseAfterMs: seg.pauseAfterMs });
          } catch (clipErr: any) {
            updatedSegments[i] = {
              ...seg,
              status: "error",
              errorMessage: clipErr.message || "Error al generar este fragmento.",
            };
            updateActiveProject({ segments: [...updatedSegments] });
            throw new Error(
              `Falló la escena ${i + 1} (${seg.sceneLabel}): ${clipErr.message}. Puedes reintentar solo ese fragmento sin perder los ya generados.`
            );
          }
        }

        if (pcmClips.length === 0) {
          throw new Error("No hubo escenas con texto válido para ensamblar.");
        }

        const combinedPcm = concatenatePcmClips(
          pcmClips,
          sampleRate,
          activeProject.leadInSilenceMs,
          activeProject.leadOutSilenceMs
        );
        const masterWavBlob = pcmInt16ToWavBlob(combinedPcm, sampleRate, channels);
        const masterWavUrl = URL.createObjectURL(masterWavBlob);
        const waveformPeaks = extractWaveformPeaks(combinedPcm, 48);
        const quality = analyzePcmQuality(
          combinedPcm,
          sampleRate,
          channels,
          bitDepth,
          activeProject.engineModel
        );

        const modeObj =
          PRODUCTION_MODES.find((m) => m.id === activeProject.modeId) || PRODUCTION_MODES[0];
        const voicesUsed = Array.from(new Set(updatedSegments.map((s) => s.voiceId)));
        const emotionsUsed = Array.from(
          new Set(
            updatedSegments.map(
              (s) => EMOTIONS.find((e) => e.id === s.emotion)?.name || s.emotion
            )
          )
        );

        const newTake: GeneratedTake = {
          id: `take_${Date.now()}`,
          projectId: activeProject.id,
          projectName: activeProject.name,
          filenameBase: "Master_Escenas",
          modeName: modeObj.name,
          styleName: `${updatedSegments.length} escenas ensambladas`,
          emotionSummary: emotionsUsed.slice(0, 3).join(" → "),
          voicesUsed,
          segmentCount: updatedSegments.length,
          textExcerpt: updatedSegments
            .map((s) => (s.useAdapted ? s.adaptedText : s.originalText))
            .join(" "),
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          durationSec: quality.durationSec,
          sampleRate,
          bitDepth,
          modelUsed: activeProject.engineModel,
          quality,
          wavUrl: masterWavUrl,
          wavBlob: masterWavBlob,
          waveformPeaks,
        };

        setTakes((prev) => [newTake, ...prev]);
        activateTake(newTake, true);
        showToast(
          `Master ensamblado con ${updatedSegments.length} escenas (${quality.durationSec.toFixed(
            1
          )} s).`
        );
      } catch (err: any) {
        setErrorBanner(err.message || "Error al generar las escenas.");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Case 2: Direct Single-Script Generation
    if (!activeProject.rawScript.trim()) {
      setErrorBanner("Escribe un guion antes de generar audio.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await synthesizeClip({
        text: activeProject.rawScript,
        voiceId: activeProject.primaryVoiceId,
        styleId: activeProject.vocalStyle,
        emotionId: activeProject.emotion,
        intensity: activeProject.emotionIntensity,
        pauseId: activeProject.pauseStyle,
      });

      const padded = concatenatePcmClips(
        [{ samples: result.samples, pauseAfterMs: 0 }],
        result.sampleRate,
        activeProject.leadInSilenceMs,
        activeProject.leadOutSilenceMs
      );
      const finalWavBlob = pcmInt16ToWavBlob(padded, result.sampleRate, result.channels);
      const finalWavUrl = URL.createObjectURL(finalWavBlob);
      const finalPeaks = extractWaveformPeaks(padded, 48);
      const finalQuality = analyzePcmQuality(
        padded,
        result.sampleRate,
        result.channels,
        result.bitDepth,
        result.quality.modelUsed
      );

      const modeObj =
        PRODUCTION_MODES.find((m) => m.id === activeProject.modeId) || PRODUCTION_MODES[0];
      const styleObj =
        VOCAL_STYLES.find((s) => s.id === activeProject.vocalStyle) || VOCAL_STYLES[0];
      const emotionObj =
        EMOTIONS.find((e) => e.id === activeProject.emotion) || EMOTIONS[0];

      const { cleanText } = activeProject.stripStageDirections
        ? stripStageDirectionsFromText(activeProject.rawScript)
        : { cleanText: activeProject.rawScript.trim() };

      const newTake: GeneratedTake = {
        id: `take_${Date.now()}`,
        projectId: activeProject.id,
        projectName: activeProject.name,
        filenameBase: "Narracion",
        modeName: modeObj.name,
        styleName: styleObj.name,
        emotionSummary: `${emotionObj.name} (${activeProject.emotionIntensity})`,
        voicesUsed: [activeProject.primaryVoiceId],
        segmentCount: 1,
        textExcerpt: cleanText,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationSec: finalQuality.durationSec,
        sampleRate: finalQuality.sampleRate,
        bitDepth: finalQuality.bitDepth,
        modelUsed: finalQuality.modelUsed,
        quality: finalQuality,
        wavUrl: finalWavUrl,
        wavBlob: finalWavBlob,
        waveformPeaks: finalPeaks,
      };

      setTakes((prev) => [newTake, ...prev]);
      activateTake(newTake, true);
      showToast(`Audio generado (${finalQuality.durationSec.toFixed(1)} s).`);
    } catch (err: any) {
      setErrorBanner(err.message || "Error al generar el audio.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Transcription QA Verification (gemini-3.5-transcribe)
  const handleVerifyTranscription = async () => {
    if (!currentTake?.wavBlob) return;
    setIsVerifyingQa(true);
    setErrorBanner(null);

    try {
      const base64Wav = await blobToBase64(currentTake.wavBlob);
      const response = await fetch("/api/verify-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Wav,
          mimeType: "audio/wav",
          expectedText: currentTake.textExcerpt,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo verificar el audio.");
      }

      setTakes((prev) =>
        prev.map((t) => (t.id === currentTake.id ? { ...t, qaResult: data.qa } : t))
      );
      showToast(`Verificación completada: ${data.qa.wordMatchPercent}% de coincidencia léxica.`);
    } catch (err: any) {
      setErrorBanner(err.message || "Error al ejecutar la verificación por transcripción.");
    } finally {
      setIsVerifyingQa(false);
    }
  };

  // Playback Controls
  const handleTogglePlayMaster = () => {
    if (!currentTake?.wavUrl || !audioRef.current) return;
    if (segmentAudioRef.current) {
      segmentAudioRef.current.pause();
      setPlayingSegmentId(null);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.src !== currentTake.wavUrl) {
        audioRef.current.src = currentTake.wavUrl;
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTogglePlaySegment = (segment: ScriptSegment) => {
    if (!segment.audioWavUrl || !segmentAudioRef.current) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    if (playingSegmentId === segment.id) {
      segmentAudioRef.current.pause();
      setPlayingSegmentId(null);
    } else {
      segmentAudioRef.current.src = segment.audioWavUrl;
      segmentAudioRef.current.volume = isMuted ? 0 : volume;
      segmentAudioRef.current
        .play()
        .then(() => setPlayingSegmentId(segment.id))
        .catch(() => setPlayingSegmentId(null));
    }
  };

  const handleDownloadTake = async (take: GeneratedTake, format: "wav" | "mp3") => {
    if (!take.wavBlob) {
      showToast("Esta toma pertenece a una sesión anterior; genera una nueva toma para exportar.");
      return;
    }

    const filename = buildProjectFilename(take.projectName, take.filenameBase, format);
    if (format === "wav") {
      downloadBlob(take.wavBlob, filename);
      showToast(`Descargando ${filename}`);
      return;
    }

    try {
      let mp3Blob = take.mp3Blob;
      if (!mp3Blob) {
        const base64Wav = await blobToBase64(take.wavBlob);
        const parsed = parseAudioBase64(base64Wav, take.sampleRate || 24000);
        mp3Blob = pcmInt16ToMp3Blob(parsed.samples, parsed.sampleRate, parsed.channels, 192);
        setTakes((prev) =>
          prev.map((t) => (t.id === take.id ? { ...t, mp3Blob } : t))
        );
      }
      downloadBlob(mp3Blob, filename);
      showToast(`Descargando ${filename}`);
    } catch {
      setErrorBanner("No se pudo codificar el archivo MP3; puedes descargarlo en WAV.");
    }
  };

  const handleDownloadSegmentWav = async (segment: ScriptSegment) => {
    if (!segment.audioWavBase64) return;
    const parsed = parseAudioBase64(segment.audioWavBase64, 24000);
    const cleaned = processStudioPcm(parsed.samples, parsed.sampleRate, {
      normalize: activeProject.normalizeOutput,
      trimDeadSilence: true,
    });
    const wavBlob = pcmInt16ToWavBlob(cleaned, parsed.sampleRate, parsed.channels);
    const filename = buildProjectFilename(
      activeProject.name,
      `Escena_${String(segment.order).padStart(2, "0")}_${segment.speaker}`,
      "wav"
    );
    downloadBlob(wavBlob, filename);
    showToast(`Descargando ${filename}`);
  };

  const canGenerate =
    activeProject.segments.length > 0
      ? activeProject.segments.some(
          (s) => (s.useAdapted ? s.adaptedText : s.originalText).trim().length > 0
        )
      : activeProject.rawScript.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Hidden Audio Elements */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />
      <audio
        ref={segmentAudioRef}
        onEnded={() => setPlayingSegmentId(null)}
        onError={() => setPlayingSegmentId(null)}
      />

      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        sceneCount={activeProject.segments.length}
        historyCount={takes.length}
        onCreateProject={handleCreateProject}
      />

      {/* Main Studio Canvas (1440px baseline) */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Global Error Banner (honest, actionable, zero silent masking) */}
        {errorBanner && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Error en la producción de audio: </strong>
                <span>{errorBanner}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-red-700 hover:text-red-950 font-semibold shrink-0 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Rail: Projects & 8 Production Modes */}
          <StudioSidebar
            projects={projects}
            activeProjectId={activeProject.id}
            onSelectProject={(id) => setActiveProjectId(id)}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            activeModeId={activeProject.modeId}
            onSelectMode={handleSelectMode}
            onOpenCapabilities={() => setIsCapabilitiesOpen(true)}
          />

          {/* Center Fluid Workspace */}
          <div className="flex-1 min-w-0 w-full">
            {activeTab === "script" && (
              <ScriptDirectorView
                project={activeProject}
                onUpdateProject={updateActiveProject}
                onApplyTemplate={handleApplyTemplate}
                onAnalyzeScript={handleAnalyzeScript}
                isAnalyzing={isAnalyzing}
                onCopyScript={() => {
                  navigator.clipboard.writeText(activeProject.rawScript);
                  showToast("Guion copiado al portapapeles.");
                }}
                onOpenScenesTab={() => setActiveTab("scenes")}
              />
            )}

            {activeTab === "scenes" && (
              <ScenesTimelineView
                project={activeProject}
                onUpdateProject={updateActiveProject}
                onUpdateSegment={updateSegment}
                onAddSegment={handleAddSegment}
                onMoveSegment={handleMoveSegment}
                onDeleteSegment={handleDeleteSegment}
                onUpdateCastVoice={handleUpdateCastVoice}
                onGenerateSingleSegment={handleGenerateSingleSegment}
                onGenerateAllAndStitch={handleGenerateMaster}
                onAnalyzeScript={handleAnalyzeScript}
                isAnalyzing={isAnalyzing}
                isBatchGenerating={isGenerating}
                playingSegmentId={playingSegmentId}
                onTogglePlaySegment={handleTogglePlaySegment}
                onDownloadSegmentWav={handleDownloadSegmentWav}
              />
            )}

            {activeTab === "glossary" && (
              <GlossaryAndQaView
                project={activeProject}
                currentTake={currentTake}
                onUpdateProject={updateActiveProject}
                onVerifyTranscription={handleVerifyTranscription}
                isVerifyingQa={isVerifyingQa}
              />
            )}

            {activeTab === "history" && (
              <TakeHistoryView
                takes={takes}
                activeProjectId={activeProject.id}
                currentTakeId={currentTakeId}
                isPlaying={isPlaying}
                onPlayTake={(take) => {
                  if (currentTakeId === take.id) {
                    handleTogglePlayMaster();
                  } else {
                    activateTake(take, true);
                  }
                }}
                onDownloadTake={handleDownloadTake}
                onDeleteTake={(id) => {
                  setTakes((prev) => prev.filter((t) => t.id !== id));
                  if (currentTakeId === id) {
                    if (audioRef.current) audioRef.current.pause();
                    setCurrentTakeId(null);
                    setIsPlaying(false);
                  }
                }}
                onClearHistory={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setTakes([]);
                  setCurrentTakeId(null);
                  setIsPlaying(false);
                  showToast("Historial vaciado.");
                }}
              />
            )}
          </div>

          {/* Right Persistent Master Console */}
          <MasterAudioDeck
            currentTake={currentTake}
            isPlaying={isPlaying}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            hasScenesReady={activeProject.segments.some((s) => s.status === "ready")}
            sceneCount={activeProject.segments.length}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            onGenerateMaster={handleGenerateMaster}
            onTogglePlay={handleTogglePlayMaster}
            onSeek={(t) => {
              if (audioRef.current) audioRef.current.currentTime = t;
              setCurrentTime(t);
            }}
            onChangeVolume={(v) => {
              setVolume(v);
              setIsMuted(v === 0);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            onToggleMute={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
            }}
            onDownload={(fmt) => {
              if (currentTake) handleDownloadTake(currentTake, fmt);
            }}
            onVerifyQa={handleVerifyTranscription}
            isVerifyingQa={isVerifyingQa}
          />
        </div>
      </main>

      {/* Quiet Studio Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>VozEscena Studio · Producción de voces originales para videos con IA</span>
          <button
            type="button"
            onClick={() => setIsCapabilitiesOpen(true)}
            className="text-slate-600 hover:text-slate-950 underline underline-offset-2 cursor-pointer"
          >
            Ver modelos y limitaciones técnicas
          </button>
        </div>
      </footer>

      {/* Honest Capabilities & Limitations Modal */}
      <CapabilitiesModal
        isOpen={isCapabilitiesOpen}
        onClose={() => setIsCapabilitiesOpen(false)}
        capabilities={capabilities}
      />

      {/* Subtle Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950 text-white px-4 py-2.5 rounded-lg border border-slate-800 shadow-lg flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
