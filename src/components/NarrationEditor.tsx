import React from "react";
import { Loader2, Play } from "lucide-react";
import { SPEED_PRESETS, STYLES, VOICES } from "../data/studioCatalog";
import { SpeedPresetId, StudioState, VocalStyleId } from "../types";

interface NarrationEditorProps {
  state: StudioState;
  previewingVoiceId: string | null;
  onUpdate: (patch: Partial<StudioState>) => void;
  onPreviewVoice: (voiceId: string) => void;
}

export const NarrationEditor: React.FC<NarrationEditorProps> = ({
  state,
  previewingVoiceId,
  onUpdate,
  onPreviewVoice,
}) => {
  const wordCount = state.script.trim() ? state.script.trim().split(/\s+/).length : 0;
  const speedWpm = SPEED_PRESETS.find((s) => s.id === state.speedPreset)?.wpm || 138;
  const estSec = wordCount > 0 ? Math.max(1, Math.round((wordCount / speedWpm) * 60)) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="main-script" className="sr-only">
          Escribe o pega tu guion
        </label>
        <textarea
          id="main-script"
          rows={7}
          value={state.script}
          onChange={(e) => onUpdate({ script: e.target.value })}
          placeholder="Escribe o pega tu guion…"
          className="w-full p-4 rounded-xl border border-slate-200 bg-white text-base leading-relaxed text-slate-900 placeholder:text-slate-400 resize-y min-h-[180px]"
        />
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums px-0.5">
          <span>
            {wordCount} palabras · ~{estSec} s
          </span>
          {state.script.length > 850 && (
            <span className="font-sans text-slate-500">
              Se dividirá automáticamente en fragmentos
            </span>
          )}
        </div>
      </div>

      {/* Single row with ONLY 3 selectors: Voz (+ preview), Estilo, Velocidad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="voice-select" className="block text-xs font-medium text-slate-600">
            Voz
          </label>
          <div className="flex items-center gap-1.5">
            <select
              id="voice-select"
              value={state.voiceId}
              onChange={(e) => onUpdate({ voiceId: e.target.value })}
              className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onPreviewVoice(state.voiceId)}
              disabled={previewingVoiceId === state.voiceId}
              className="h-[42px] w-[42px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
              title="Escuchar muestra corta"
              aria-label="Escuchar muestra de voz"
            >
              {previewingVoiceId === state.voiceId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="style-select" className="block text-xs font-medium text-slate-600">
            Estilo
          </label>
          <select
            id="style-select"
            value={state.styleId}
            onChange={(e) => onUpdate({ styleId: e.target.value as VocalStyleId })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
          >
            {STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="speed-select" className="block text-xs font-medium text-slate-600">
            Velocidad
          </label>
          <select
            id="speed-select"
            value={state.speedPreset}
            onChange={(e) => onUpdate({ speedPreset: e.target.value as SpeedPresetId })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900"
          >
            {SPEED_PRESETS.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
