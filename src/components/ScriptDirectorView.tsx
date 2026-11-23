import React, { useState } from "react";
import {
  Wand2,
  BookOpen,
  Copy,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from "lucide-react";
import {
  EMOTIONS,
  PAUSE_STYLES,
  PRODUCTION_MODES,
  REGIONAL_VARIANTS,
  STUDIO_TEMPLATES,
  VOCAL_STYLES,
  VOICE_MODELS,
} from "../data/studioCatalog";
import {
  EmotionId,
  EmotionIntensity,
  PauseStyleId,
  RegionalVariantId,
  StudioProject,
  StudioTemplate,
  TtsEngineModelId,
  VocalStyleId,
} from "../types";
import { stripStageDirectionsFromText } from "../utils/audioUtils";

interface ScriptDirectorViewProps {
  project: StudioProject;
  onUpdateProject: (patch: Partial<StudioProject>) => void;
  onApplyTemplate: (template: StudioTemplate) => void;
  onAnalyzeScript: () => void;
  isAnalyzing: boolean;
  onCopyScript: () => void;
  onOpenScenesTab: () => void;
}

export const ScriptDirectorView: React.FC<ScriptDirectorViewProps> = ({
  project,
  onUpdateProject,
  onApplyTemplate,
  onAnalyzeScript,
  isAnalyzing,
  onCopyScript,
  onOpenScenesTab,
}) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male">("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeMode =
    PRODUCTION_MODES.find((m) => m.id === project.modeId) || PRODUCTION_MODES[0];
  const activeStyle =
    VOCAL_STYLES.find((s) => s.id === project.vocalStyle) || VOCAL_STYLES[0];
  const activeEmotion =
    EMOTIONS.find((e) => e.id === project.emotion) || EMOTIONS[0];

  const { cleanText, extractedDirections } = project.stripStageDirections
    ? stripStageDirectionsFromText(project.rawScript)
    : { cleanText: project.rawScript.trim(), extractedDirections: [] };

  const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = cleanText.length;
  // Natural Latin American Spanish narration rate (~138 words/min at 1.0x)
  const estimatedSec =
    wordCount > 0 ? Math.max(1, Math.round((wordCount / (138 * project.speed)) * 60)) : 0;

  const durationDelta =
    project.targetDurationSec && project.targetDurationSec > 0
      ? estimatedSec - project.targetDurationSec
      : null;

  const filteredVoices = VOICE_MODELS.filter((v) =>
    genderFilter === "all" ? true : v.gender === genderFilter
  );

  return (
    <div className="space-y-6">
      {/* 01. Script Editor & Intelligent Direction */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>{activeMode.code}</span>
              <span aria-hidden="true">·</span>
              <span>{activeMode.name}</span>
              <span aria-hidden="true">·</span>
              <span>{activeMode.useCases}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-950 mt-0.5">
              Guion y dirección narrativa
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Escenarios de prueba (5)</span>
            </button>

            <button
              type="button"
              onClick={onAnalyzeScript}
              disabled={isAnalyzing || !project.rawScript.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>{isAnalyzing ? "Analizando guion..." : "Analizar y dirigir guion"}</span>
            </button>
          </div>
        </div>

        {/* 5 Mandatory Test Scenarios Picker */}
        {showTemplates && (
          <div className="border-t border-b border-slate-200 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800">
                Cargar guion de referencia (Escenarios 1 al 5)
              </p>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {STUDIO_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onApplyTemplate(tpl);
                    setShowTemplates(false);
                  }}
                  className="text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="text-[11px] text-blue-700 font-medium">
                    {tpl.testBadge} · {tpl.category}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {tpl.title}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Script Input */}
        <div>
          <label htmlFor="studio-script-input" className="sr-only">
            Texto del guion para narración o diálogo
          </label>
          <textarea
            id="studio-script-input"
            rows={8}
            value={project.rawScript}
            onChange={(e) => onUpdateProject({ rawScript: e.target.value })}
            placeholder="Escribe tu narración, cuento o diálogo. Puedes incluir acotaciones como [pausa dramática], (voz contenida) o nombres de personajes como Elena: y Mateo: — el estudio separará las acotaciones para interpretarlas sin leerlas en voz alta."
            className="w-full p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-sm leading-relaxed text-slate-900 resize-y min-h-[175px]"
          />
        </div>

        {/* Script Metrics, Stage Direction Hygiene & Target Duration */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 font-mono tabular-nums">
            <span>{wordCount} palabras habladas</span>
            <span aria-hidden="true">·</span>
            <span>{charCount} caracteres</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-900 font-medium">
              ~{estimatedSec} s estimados ({project.speed.toFixed(2)}x)
            </span>
            {extractedDirections.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-blue-700 font-sans font-medium">
                  {extractedDirections.length} acotación(es) separada(s) del texto hablado
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Objetivo (s):</span>
              <input
                type="number"
                min={5}
                max={600}
                placeholder="Libre"
                value={project.targetDurationSec ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUpdateProject({ targetDurationSec: val && val > 0 ? val : null });
                }}
                className="w-16 px-2 py-1 border border-slate-200 rounded-md text-xs font-mono tabular-nums text-slate-900 bg-white focus:outline-none focus:border-blue-600"
              />
            </label>

            <button
              type="button"
              onClick={onCopyScript}
              disabled={!project.rawScript.trim()}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              title="Copiar guion"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdateProject({ rawScript: "", segments: [], analysis: null })}
              disabled={!project.rawScript.trim()}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
              title="Limpiar guion"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Duration Fit Feedback (Honest, no artificial acceleration) */}
        {durationDelta !== null && wordCount > 0 && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-start gap-2 ${
              durationDelta <= 0
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : durationDelta <= 5
                ? "bg-amber-50/80 border-amber-200 text-amber-950"
                : "bg-red-50/80 border-red-200 text-red-900"
            }`}
          >
            {durationDelta <= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div>
              {durationDelta <= 0 ? (
                <span>
                  Encaje natural: el guion dura aprox.{" "}
                  <strong className="font-mono tabular-nums">{estimatedSec} s</strong> dentro de tu
                  objetivo de{" "}
                  <strong className="font-mono tabular-nums">{project.targetDurationSec} s</strong>.
                </span>
              ) : (
                <span>
                  El texto excede el objetivo en aprox.{" "}
                  <strong className="font-mono tabular-nums">+{durationDelta} s</strong>. Para no
                  sacrificar naturalidad acelerando la voz, conviene dividir en más escenas, ampliar
                  el tiempo visual del video o acortar una frase.
                </span>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Summary Strip (when analyzed via gemini-4-hydrogen) */}
        {project.analysis && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-700">
                <strong className="text-slate-950">Dirección detectada:</strong>{" "}
                {project.analysis.contentType} · Público: {project.analysis.targetAudience} ·
                Personajes: {project.analysis.detectedSpeakers.join(", ")}
              </div>
              <button
                type="button"
                onClick={onOpenScenesTab}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer whitespace-nowrap"
              >
                Ver {project.segments.length} escena(s) dirigida(s) →
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Arco emocional: {project.analysis.emotionalArcSummary}
            </p>
          </div>
        )}
      </section>

      {/* 02. Voice Casting (Original Prebuilt Voices — NO Cloning) */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">Voz base y dirección vocal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Voces originales del motor Gemini 3.8 TTS sin clonación ni muestras personales.
            </p>
          </div>

          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 text-xs">
            {(
              [
                { id: "all", label: "Todas" },
                { id: "female", label: "Femeninas" },
                { id: "male", label: "Masculinas" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGenderFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  genderFilter === opt.id
                    ? "bg-white text-slate-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          {filteredVoices.map((voice) => {
            const isSelected = project.primaryVoiceId === voice.id;
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => onUpdateProject({ primaryVoiceId: voice.id })}
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-950">{voice.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {voice.gender === "female" ? "Femenina" : "Masculina"}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-blue-800 mt-0.5">
                  {voice.register}
                </div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-snug">
                  {voice.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Style & Emotion Direction Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
          {/* 18 Vocal Styles */}
          <div className="space-y-2">
            <label
              htmlFor="vocal-style-select"
              className="block text-xs font-semibold text-slate-900"
            >
              Estilo de interpretación (18 estilos)
            </label>
            <select
              id="vocal-style-select"
              value={project.vocalStyle}
              onChange={(e) =>
                onUpdateProject({ vocalStyle: e.target.value as VocalStyleId })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {VOCAL_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 leading-snug">{activeStyle.description}</p>
            {activeStyle.limitationNote && (
              <p className="text-[11px] text-amber-800 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{activeStyle.limitationNote}</span>
              </p>
            )}
          </div>

          {/* 18 Emotions + Intensity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="emotion-select"
                className="text-xs font-semibold text-slate-900"
              >
                Emoción principal (18 matices)
              </label>
              <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 text-[11px]">
                {(
                  [
                    { id: "sutil", label: "Sutil" },
                    { id: "moderada", label: "Moderada" },
                    { id: "marcada", label: "Marcada" },
                  ] as Array<{ id: EmotionIntensity; label: string }>
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => onUpdateProject({ emotionIntensity: lvl.id })}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      project.emotionIntensity === lvl.id
                        ? "bg-white text-slate-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
            <select
              id="emotion-select"
              value={project.emotion}
              onChange={(e) => onUpdateProject({ emotion: e.target.value as EmotionId })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {EMOTIONS.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 leading-snug">
              La intensidad ajusta matiz, cadencia y tensión vocal — no el volumen. Emoción activa:{" "}
              <span className="font-medium text-slate-800">{activeEmotion.name}</span>.
            </p>
          </div>
        </div>

        {/* Regional Variant, Pause Behavior & Natural Pace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <label
              htmlFor="regional-variant-select"
              className="block text-xs font-semibold text-slate-900"
            >
              Idioma y variante regional
            </label>
            <select
              id="regional-variant-select"
              value={project.regionalVariant}
              onChange={(e) =>
                onUpdateProject({ regionalVariant: e.target.value as RegionalVariantId })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {REGIONAL_VARIANTS.map((rv) => (
                <option key={rv.id} value={rv.id}>
                  {rv.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="pause-style-select"
              className="block text-xs font-semibold text-slate-900"
            >
              Gestión de pausas y ritmo
            </label>
            <select
              id="pause-style-select"
              value={project.pauseStyle}
              onChange={(e) =>
                onUpdateProject({ pauseStyle: e.target.value as PauseStyleId })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {PAUSE_STYLES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="speed-range" className="font-semibold text-slate-900">
                Ritmo de narración
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {project.speed.toFixed(2)}x
              </span>
            </div>
            <input
              id="speed-range"
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={project.speed}
              onChange={(e) => onUpdateProject({ speed: parseFloat(e.target.value) })}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
              <span>0.75x pausado</span>
              <span>1.00x natural</span>
              <span>1.35x ágil</span>
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Studio Options */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 cursor-pointer"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>Opciones avanzadas del motor y humanización</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label
                  htmlFor="tts-engine-select"
                  className="block font-semibold text-slate-900"
                >
                  Modelo de síntesis Gemini 3.8
                </label>
                <select
                  id="tts-engine-select"
                  value={project.engineModel}
                  onChange={(e) =>
                    onUpdateProject({ engineModel: e.target.value as TtsEngineModelId })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="gemini-3.8-flash-tts">
                    gemini-3.8-flash-tts — Dirección expresiva y diálogos (Recomendado)
                  </option>
                  <option value="gemini-3.8-flash-lite-tts">
                    gemini-3.8-flash-lite-tts — Alta eficiencia y menor latencia
                  </option>
                </select>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={project.stripStageDirections}
                    onChange={(e) =>
                      onUpdateProject({ stripStageDirections: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-300 text-blue-700"
                  />
                  <span className="text-slate-700">
                    Separar acotaciones <span className="font-mono">[...]</span> y{" "}
                    <span className="font-mono">(...)</span> para interpretarlas sin leerlas en voz
                    alta
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={project.allowSubtleBreath}
                    onChange={(e) =>
                      onUpdateProject({ allowSubtleBreath: e.target.checked })
                    }
                    className="mt-0.5 rounded border-slate-300 text-blue-700"
                  />
                  <span className="text-slate-700">
                    Permitir respiraciones sutiles naturales en pausas narrativas (sin efectos
                    sintéticos)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
