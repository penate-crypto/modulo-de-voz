import { useEffect, useRef, useState } from "react";
import { DEFAULT_GLOSSARY, QUICK_EXAMPLES, VOICES } from "../data/studioCatalog";
import { BackendCapabilities, GeneratedTake, SceneItem, StudioState } from "../types";
import { fetchCapabilities, requestSingleAudio, verifyTakeAudio } from "../services/studioApi";
import {
  blobToBase64,
  parseAudioBase64,
  pcmInt16ToMp3Blob,
  pcmInt16ToWavBlob,
} from "../utils/audioUtils";
import { buildFilename, downloadBlob } from "../utils/scriptUtils";

const STORAGE_KEY = "vozescena_minimal_v2";

const INITIAL_STATE: StudioState = {
  mode: "narration",
  script: "",
  dialogueScript: QUICK_EXAMPLES[3].text,
  speaker1Name: "Elena",
  speaker1Voice: "Kore",
  speaker2Name: "Mateo",
  speaker2Voice: "Puck",
  voiceId: "Kore",
  styleId: "narrador_calido",
  speedPreset: "normal",
  ttsModel: "gemini-2.5-flash-preview-tts",
  emotionId: "neutral_calido",
  emotionIntensity: "moderada",
  pauseStyle: "natural",
  regionalVariant: "es_latam_sv",
  leadInSilenceMs: 120,
  leadOutSilenceMs: 250,
  normalizeOutput: true,
  stripStageDirections: true,
  glossary: DEFAULT_GLOSSARY,
  scenes: [],
};

function loadInitialState(): StudioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_STATE,
      ...parsed,
      scenes: Array.isArray(parsed.scenes)
        ? parsed.scenes.map((s: SceneItem) => ({
            ...s,
            status: "idle",
            audioWavUrl: undefined,
            audioWavBase64: undefined,
            quality: undefined,
          }))
        : [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function useStudioState() {
  const [state, setState] = useState<StudioState>(loadInitialState);
  const [takes, setTakes] = useState<GeneratedTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isVerifyingQa, setIsVerifyingQa] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [capabilities, setCapabilities] = useState<BackendCapabilities | null>(null);

  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const auxAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCacheRef = useRef<Map<string, string>>(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;

  const activeTake = takes.find((t) => t.id === activeTakeId) || null;

  useEffect(() => {
    fetchCapabilities().then((c) => c && setCapabilities(c));
    return () => {
      previewCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    try {
      const compact = {
        ...state,
        scenes: state.scenes.map((s) => ({
          ...s,
          status: "idle",
          audioWavUrl: undefined,
          audioWavBase64: undefined,
          quality: undefined,
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const updateState = (patch: Partial<StudioState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // Safely update a scene and invalidate cached audio whenever spoken parameters change
  const updateScene = (sceneId: string, patch: Partial<SceneItem>) => {
    const audioInvalidatingKeys: Array<keyof SceneItem> = [
      "text",
      "voiceId",
      "styleId",
      "emotionId",
      "speaker",
    ];
    const shouldInvalidate = audioInvalidatingKeys.some((k) => k in patch);

    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        if (shouldInvalidate) {
          if (scene.audioWavUrl) URL.revokeObjectURL(scene.audioWavUrl);
          return {
            ...scene,
            ...patch,
            status: "idle",
            errorMessage: undefined,
            audioWavUrl: undefined,
            audioWavBase64: undefined,
            quality: undefined,
          };
        }
        return { ...scene, ...patch };
      }),
    }));
  };

  const deleteScene = (sceneId: string) => {
    setState((prev) => {
      const target = prev.scenes.find((s) => s.id === sceneId);
      if (target?.audioWavUrl) URL.revokeObjectURL(target.audioWavUrl);
      return { ...prev, scenes: prev.scenes.filter((s) => s.id !== sceneId) };
    });
  };

  const addScene = () => {
    setState((prev) => ({
      ...prev,
      scenes: [
        ...prev.scenes,
        {
          id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: `Escena ${prev.scenes.length + 1}`,
          speaker: "Narrador",
          voiceId: prev.voiceId,
          text: "",
          styleId: prev.styleId,
          emotionId: prev.emotionId,
          pauseAfterMs: 350,
          status: "idle",
        },
      ],
    }));
  };

  const playTakeInMaster = (take: GeneratedTake, autoPlay = true) => {
    setActiveTakeId(take.id);
    setDuration(take.durationSec);
    setCurrentTime(0);
    auxAudioRef.current?.pause();
    setPlayingSceneId(null);

    if (masterAudioRef.current && take.wavUrl) {
      masterAudioRef.current.src = take.wavUrl;
      if (autoPlay) {
        masterAudioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  const handleTogglePlayMaster = () => {
    if (!activeTake?.wavUrl || !masterAudioRef.current) return;
    auxAudioRef.current?.pause();
    setPlayingSceneId(null);
    if (isPlaying) {
      masterAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (masterAudioRef.current.src !== activeTake.wavUrl) {
        masterAudioRef.current.src = activeTake.wavUrl;
      }
      masterAudioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSeekMaster = (sec: number) => {
    if (masterAudioRef.current) masterAudioRef.current.currentTime = sec;
    setCurrentTime(sec);
  };

  const handlePreviewVoice = async (voiceId: string) => {
    const voiceObj = VOICES.find((v) => v.id === voiceId);
    if (!voiceObj) return;
    setErrorMessage(null);

    const cachedUrl = previewCacheRef.current.get(voiceId);
    if (cachedUrl && auxAudioRef.current) {
      masterAudioRef.current?.pause();
      setIsPlaying(false);
      setPlayingSceneId(null);
      auxAudioRef.current.src = cachedUrl;
      auxAudioRef.current.play().catch(() => {});
      return;
    }

    setPreviewingVoiceId(voiceId);
    try {
      const res = await requestSingleAudio(stateRef.current, {
        text: voiceObj.sampleLine,
        voiceId,
        styleId: "narrador_calido",
        emotionId: "neutral_calido",
        addMargins: false,
      });
      previewCacheRef.current.set(voiceId, res.wavUrl);
      if (auxAudioRef.current) {
        masterAudioRef.current?.pause();
        setIsPlaying(false);
        auxAudioRef.current.src = res.wavUrl;
        auxAudioRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setErrorMessage(err.message || "No se pudo reproducir la muestra de voz.");
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleTogglePlayScene = (scene: SceneItem) => {
    if (!scene.audioWavUrl || !auxAudioRef.current) return;
    masterAudioRef.current?.pause();
    setIsPlaying(false);
    if (playingSceneId === scene.id) {
      auxAudioRef.current.pause();
      setPlayingSceneId(null);
    } else {
      auxAudioRef.current.src = scene.audioWavUrl;
      auxAudioRef.current
        .play()
        .then(() => setPlayingSceneId(scene.id))
        .catch(() => setPlayingSceneId(null));
    }
  };

  const handleDownloadSceneWav = (scene: SceneItem) => {
    if (!scene.audioWavBase64) return;
    const parsed = parseAudioBase64(scene.audioWavBase64, 24000);
    const blob = pcmInt16ToWavBlob(parsed.samples, parsed.sampleRate, parsed.channels);
    downloadBlob(blob, buildFilename(scene.title, "wav"));
  };

  const handleDownloadTake = async (take: GeneratedTake, format: "wav" | "mp3") => {
    if (!take.wavBlob) return;
    const filename = buildFilename(take.title, format);
    if (format === "wav") {
      downloadBlob(take.wavBlob, filename);
      return;
    }
    try {
      let mp3 = take.mp3Blob;
      if (!mp3) {
        const b64 = await blobToBase64(take.wavBlob);
        const parsed = parseAudioBase64(b64, take.sampleRate || 24000);
        mp3 = pcmInt16ToMp3Blob(parsed.samples, parsed.sampleRate, parsed.channels, 192);
        setTakes((prev) => prev.map((t) => (t.id === take.id ? { ...t, mp3Blob: mp3 } : t)));
      }
      downloadBlob(mp3, filename);
    } catch {
      setErrorMessage("No se pudo codificar el MP3; puedes descargarlo en WAV.");
    }
  };

  const handleVerifyQa = async () => {
    if (!activeTake?.wavBlob) return;
    setIsVerifyingQa(true);
    setErrorMessage(null);
    try {
      const qa = await verifyTakeAudio(activeTake.wavBlob, activeTake.textForQa);
      setTakes((prev) => prev.map((t) => (t.id === activeTake.id ? { ...t, qaResult: qa } : t)));
    } catch (err: any) {
      setErrorMessage(err.message || "Error al verificar la transcripción.");
    } finally {
      setIsVerifyingQa(false);
    }
  };

  const handleDeleteTake = (id: string) => {
    setTakes((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.wavUrl) URL.revokeObjectURL(target.wavUrl);
      return prev.filter((t) => t.id !== id);
    });
    if (activeTakeId === id) {
      masterAudioRef.current?.pause();
      setActiveTakeId(null);
      setIsPlaying(false);
    }
  };

  const handleClearAllTakes = () => {
    takes.forEach((t) => t.wavUrl && URL.revokeObjectURL(t.wavUrl));
    masterAudioRef.current?.pause();
    setTakes([]);
    setActiveTakeId(null);
    setIsPlaying(false);
  };

  return {
    state,
    setState,
    stateRef,
    takes,
    setTakes,
    activeTake,
    activeTakeId,
    errorMessage,
    setErrorMessage,
    previewingVoiceId,
    isVerifyingQa,
    isPlaying,
    setIsPlaying,
    playingSceneId,
    setPlayingSceneId,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    capabilities,
    masterAudioRef,
    auxAudioRef,
    updateState,
    updateScene,
    addScene,
    deleteScene,
    playTakeInMaster,
    handleTogglePlayMaster,
    handleSeekMaster,
    handlePreviewVoice,
    handleTogglePlayScene,
    handleDownloadSceneWav,
    handleDownloadTake,
    handleVerifyQa,
    handleDeleteTake,
    handleClearAllTakes,
  };
}
