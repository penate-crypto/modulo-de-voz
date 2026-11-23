import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { EMOTIONS, PAUSE_OPTIONS, REGIONAL_OPTIONS } from "../data/studioCatalog";
import {
  EmotionId,
  EmotionIntensity,
  PauseStyleId,
  RegionalVariantId,
  StudioState,
  TtsModelId,
} from "../types";

interface AdvancedOptionsProps {
  state: StudioState;
  onUpdate: (patch: Partial<StudioState>) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({ state, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [spoken, setSpoken] = useState("");

  const handleAddGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !spoken.trim()) return;
    onUpdate({
      glossary: [
        { id: `g_${Date.now()}`, term: term.trim(), spokenForm: spoken.trim() },
        ...state.glossary,
      ],
    });
    setTerm("");
    setSpoken("");
  };

  const handleDeleteGlossary = (id: string) => {
    onUpdate({ glossary: state.glossary.filter((g) => g.id !== id) });
  };

  return (
    <section className="border border-slate-200 rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
      >
        <span>Opciones avanzadas</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-5 pt-2 border-t border-slate-100 space-y-5 text-xs">
          {/* Emotion, Intensity & Pauses */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Emoción</label>
              <select
                value={state.emotionId}
                onChange={(e) => onUpdate({ emotionId: e.target.value as EmotionId })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
              >
                {EMOTIONS.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Intensidad</label>
              <select
                value={state.emotionIntensity}
                onChange={(e) =>
                  onUpdate({ emotionIntensity: e.target.value as EmotionIntensity })
                }
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
              >
                <option value="sutil">Sutil</option>
                <option value="moderada">Moderada</option>
                <option value="marcada">Marcada</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Pausas</label>
              <select
                value={state.pauseStyle}
                onChange={(e) => onUpdate({ pauseStyle: e.target.value as PauseStyleId })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
              >
                {PAUSE_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Regional Variant & TTS Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Variante de español</label>
              <select
                value={state.regionalVariant}
                onChange={(e) =>
                  onUpdate({ regionalVariant: e.target.value as RegionalVariantId })
                }
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
              >
                {REGIONAL_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Modelo Gemini TTS</label>
              <select
                value={state.ttsModel}
                onChange={(e) => onUpdate({ ttsModel: e.target.value as TtsModelId })}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-900"
              >
                <option value="gemini-2.5-flash-preview-tts">
                  gemini-2.5-flash-preview-tts (Rápido)
                </option>
                <option value="gemini-2.5-pro-preview-tts">
                  gemini-2.5-pro-preview-tts (Pro)
                </option>
              </select>
            </div>
          </div>

          {/* Silence Margins & Toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Silencio inicial (ms)</label>
              <input
                type="number"
                min={0}
                max={3000}
                step={50}
                value={state.leadInSilenceMs}
                onChange={(e) =>
                  onUpdate({ leadInSilenceMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-medium text-slate-700">Silencio final (ms)</label>
              <input
                type="number"
                min={0}
                max={3000}
                step={50}
                value={state.leadOutSilenceMs}
                onChange={(e) =>
                  onUpdate({ leadOutSilenceMs: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono tabular-nums"
              />
            </div>

            <label className="flex items-center gap-2 pt-4 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={state.normalizeOutput}
                onChange={(e) => onUpdate({ normalizeOutput: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Normalizar volumen</span>
            </label>

            <label className="flex items-center gap-2 pt-4 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={state.stripStageDirections}
                onChange={(e) => onUpdate({ stripStageDirections: e.target.checked })}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Quitar acotaciones</span>
            </label>
          </div>

          {/* Pronunciation Glossary */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="font-medium text-slate-800">
              Glosario de pronunciación ({state.glossary.length})
            </div>

            <form onSubmit={handleAddGlossary} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Sigla o término (ej. 240 V)"
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
              />
              <input
                type="text"
                value={spoken}
                onChange={(e) => setSpoken(e.target.value)}
                placeholder="Cómo leerlo (ej. doscientos cuarenta voltios)"
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
              />
              <button
                type="submit"
                disabled={!term.trim() || !spoken.trim()}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </form>

            {state.glossary.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                {state.glossary.map((g) => (
                  <div
                    key={g.id}
                    className="px-3 py-1.5 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-slate-700">
                      <strong className="font-mono text-slate-900">{g.term}</strong> →{" "}
                      {g.spokenForm}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGlossary(g.id)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      aria-label={`Eliminar ${g.term}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
