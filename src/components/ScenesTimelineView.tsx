import React from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Users,
  Layers,
  AlertTriangle,
  Wand2,
  Loader2,
} from "lucide-react";
import { EMOTIONS, VOCAL_STYLES, VOICE_MODELS } from "../data/studioCatalog";
import {
  CharacterCast,
  EmotionId,
  EmotionIntensity,
  ScriptSegment,
  StudioProject,
  VocalStyleId,
} from "../types";
import { formatDuration } from "../utils/audioUtils";

interface ScenesTimelineViewProps {
  project: StudioProject;
  onUpdateProject: (patch: Partial<StudioProject>) => void;
  onUpdateSegment: (segmentId: string, patch: Partial<ScriptSegment>) => void;
  onAddSegment: () => void;
  onMoveSegment: (index: number, direction: -1 | 1) => void;
  onDeleteSegment: (segmentId: string) => void;
  onUpdateCastVoice: (speaker: string, voiceId: string) => void;
  onGenerateSingleSegment: (segmentId: string) => void;
  onGenerateAllAndStitch: () => void;
  onAnalyzeScript: () => void;
  isAnalyzing: boolean;
  isBatchGenerating: boolean;
  playingSegmentId: string | null;
  onTogglePlaySegment: (segment: ScriptSegment) => void;
  onDownloadSegmentWav: (segment: ScriptSegment) => void;
}

export const ScenesTimelineView: React.FC<ScenesTimelineViewProps> = ({
  project,
  onUpdateProject,
  onUpdateSegment,
  onAddSegment,
  onMoveSegment,
  onDeleteSegment,
  onUpdateCastVoice,
  onGenerateSingleSegment,
  onGenerateAllAndStitch,
  onAnalyzeScript,
  isAnalyzing,
  isBatchGenerating,
  playingSegmentId,
  onTogglePlaySegment,
  onDownloadSegmentWav,
}) => {
  const uniqueSpeakers = Array.from(
    new Set(project.segments.map((s) => s.speaker.trim()).filter(Boolean))
  );
  const canUseDualNative = uniqueSpeakers.length === 2;
  const readyCount = project.segments.filter((s) => s.status === "ready").length;

  const ensureCastEntries: CharacterCast[] = uniqueSpeakers.map((speaker) => {
    const existing = project.cast.find((c) => c.speaker === speaker);
    if (existing) return existing;
    const segVoice =
      project.segments.find((s) => s.speaker === speaker)?.voiceId ||
      project.primaryVoiceId;
    return {
      speaker,
      voiceId: segVoice,
      defaultStyle: project.vocalStyle,
      characterNote: "",
    };
  });

  return (
    <div className="space-y-6">
      {/* Header & Batch Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-950">
              Producción por escenas y diálogos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Controla el reparto de voces, la progresión emocional por escena y genera o reintenta
              clips individuales sin repetir todo el proyecto.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddSegment}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar escena</span>
            </button>

            <button
              type="button"
              onClick={onGenerateAllAndStitch}
              disabled={isBatchGenerating || project.segments.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              {isBatchGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Layers className="w-3.5 h-3.5" />
              )}
              <span>
                {isBatchGenerating
                  ? "Generando escenas..."
                  : canUseDualNative && project.useNativeDualSpeaker
                  ? "Generar diálogo nativo (2 voces)"
                  : "Generar escenas y ensamblar Master"}
              </span>
            </button>
          </div>
        </div>

        {/* Character Cast Assignment (Strict consistency across dialogue) */}
        {ensureCastEntries.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Reparto y continuidad de voz ({ensureCastEntries.length})</span>
              </div>

              {canUseDualNative && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={project.useNativeDualSpeaker}
                    onChange={(e) =>
                      onUpdateProject({ useNativeDualSpeaker: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  <span>
                    Usar diálogo nativo simultáneo (
                    <span className="font-mono text-[11px]">gemini-3.8-flash-tts</span>, 2 voces)
                  </span>
                </label>
              )}
            </div>

            {uniqueSpeakers.length > 2 && (
              <p className="text-xs text-slate-600">
                Se detectaron {uniqueSpeakers.length} personajes. Como el diálogo nativo simultáneo
                admite 2 voces por llamada, el estudio sintetiza cada intervención con su voz fija y
                las ensambla en el orden exacto del guion.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ensureCastEntries.map((castItem) => (
                <div
                  key={castItem.speaker}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70"
                >
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {castItem.speaker}
                  </span>
                  <select
                    aria-label={`Voz para ${castItem.speaker}`}
                    value={castItem.voiceId}
                    onChange={(e) => onUpdateCastVoice(castItem.speaker, e.target.value)}
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {VOICE_MODELS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender === "female" ? "F" : "M"})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Empty State */}
      {project.segments.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Aún no has dividido el guion en escenas o intervenciones
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Usa el director de guion para segmentar automáticamente tu texto por escenas, detectar
            personajes y asignar la progresión emocional, o agrega escenas manualmente.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onAnalyzeScript}
              disabled={isAnalyzing || !project.rawScript.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white text-xs font-semibold cursor-pointer"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>Segmentar guion con IA</span>
            </button>
            <button
              type="button"
              onClick={onAddSegment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear escena manual</span>
            </button>
          </div>
        </section>
      ) : (
        /* Ordered Scene / Dialogue Clips */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {project.segments.length} fragmento(s) en orden · {readyCount} listo(s) con audio
            </span>
            <span>Edita cada escena o regenera un clip individual en cualquier momento</span>
          </div>

          {project.segments.map((segment, index) => {
            const isPlayingThis = playingSegmentId === segment.id;
            const hasAdaptedDiff =
              segment.adaptedText.trim() &&
              segment.adaptedText.trim() !== segment.originalText.trim();

            return (
              <article
                key={segment.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
              >
                {/* Row 1: Order, Scene Label, Speaker & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-slate-500 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="text"
                      value={segment.sceneLabel}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, { sceneLabel: e.target.value })
                      }
                      aria-label="Etiqueta de escena"
                      className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 w-36"
                    />
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <input
                      type="text"
                      value={segment.speaker}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, { speaker: e.target.value })
                      }
                      aria-label="Personaje"
                      className="text-blue-800 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5 w-28"
                    />
                    <span className="text-slate-400">({segment.voiceId})</span>
                    {segment.quality && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="font-mono tabular-nums text-emerald-700 font-medium">
                          {formatDuration(segment.quality.durationSec)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {segment.audioWavUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTogglePlaySegment(segment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                        >
                          {isPlayingThis ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          <span>{isPlayingThis ? "Pausar" : "Escuchar"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadSegmentWav(segment)}
                          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 cursor-pointer"
                          title="Descargar clip WAV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onGenerateSingleSegment(segment.id)}
                      disabled={segment.status === "generating"}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 disabled:opacity-45 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          segment.status === "generating" ? "animate-spin" : ""
                        }`}
                      />
                      <span>
                        {segment.status === "generating"
                          ? "Generando..."
                          : segment.status === "ready"
                          ? "Regenerar"
                          : "Generar clip"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveSegment(index, -1)}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Subir"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveSegment(index, 1)}
                      disabled={index === project.segments.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Bajar"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSegment(segment.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Eliminar escena"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Faithful vs Adapted Text Switch (Explicit user consent before altering wording) */}
                <div className="space-y-1.5">
                  {hasAdaptedDiff && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Versión hablada para este clip:
                      </span>
                      <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSegment(segment.id, { useAdapted: false })
                          }
                          className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                            !segment.useAdapted
                              ? "bg-white text-slate-950 shadow-2xs"
                              : "text-slate-600"
                          }`}
                        >
                          Texto fiel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSegment(segment.id, { useAdapted: true })
                          }
                          className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                            segment.useAdapted
                              ? "bg-white text-slate-950 shadow-2xs"
                              : "text-slate-600"
                          }`}
                        >
                          Puntuación oral adaptada
                        </button>
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={2}
                    value={segment.useAdapted ? segment.adaptedText : segment.originalText}
                    onChange={(e) =>
                      onUpdateSegment(
                        segment.id,
                        segment.useAdapted
                          ? { adaptedText: e.target.value }
                          : { originalText: e.target.value }
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-600 text-sm text-slate-900 leading-relaxed resize-y"
                  />
                </div>

                {/* Per-Scene Vocal Direction Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Estilo</label>
                    <select
                      value={segment.vocalStyle}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, {
                          vocalStyle: e.target.value as VocalStyleId,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      {VOCAL_STYLES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Emoción</label>
                    <select
                      value={segment.emotion}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, {
                          emotion: e.target.value as EmotionId,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      {EMOTIONS.map((em) => (
                        <option key={em.id} value={em.id}>
                          {em.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Intensidad</label>
                    <select
                      value={segment.emotionIntensity}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, {
                          emotionIntensity: e.target.value as EmotionIntensity,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      <option value="sutil">Sutil</option>
                      <option value="moderada">Moderada</option>
                      <option value="marcada">Marcada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Pausa posterior (ms)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={4000}
                      step={50}
                      value={segment.pauseAfterMs}
                      onChange={(e) =>
                        onUpdateSegment(segment.id, {
                          pauseAfterMs: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-mono tabular-nums text-slate-800"
                    />
                  </div>
                </div>

                {/* Extracted Stage Notes / Visual Sync Context */}
                {(segment.stageDirections.length > 0 || segment.visualSyncNote) && (
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {segment.stageDirections.length > 0 && (
                      <span>
                        Acotaciones no leídas: {segment.stageDirections.join(" · ")}
                      </span>
                    )}
                    {segment.visualSyncNote && (
                      <span>Nota visual: {segment.visualSyncNote}</span>
                    )}
                  </div>
                )}

                {/* Clip-specific Error with Retry */}
                {segment.status === "error" && segment.errorMessage && (
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      {segment.errorMessage}
                    </span>
                    <button
                      type="button"
                      onClick={() => onGenerateSingleSegment(segment.id)}
                      className="text-xs font-semibold text-red-800 underline shrink-0 cursor-pointer"
                    >
                      Reintentar clip
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
