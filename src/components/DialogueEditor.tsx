import React from "react";
import { Play, Loader2 } from "lucide-react";
import { VOICES } from "../data/studioCatalog";
import { StudioState } from "../types";

interface DialogueEditorProps {
  state: StudioState;
  onUpdate: (patch: Partial<StudioState>) => void;
  previewingVoiceId: string | null;
  onPreviewVoice: (voiceId: string) => void;
}

export const DialogueEditor: React.FC<DialogueEditorProps> = ({
  state,
  onUpdate,
  previewingVoiceId,
  onPreviewVoice,
}) => {
  return (
    <div className="space-y-4">
      {/* Two Speaker Cast Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Speaker 1 */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
          <label className="block text-xs font-medium text-slate-600">Personaje 1</label>
          <input
            type="text"
            value={state.speaker1Name}
            onChange={(e) => onUpdate({ speaker1Name: e.target.value })}
            placeholder="Ej. Elena"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
          />
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Voz del personaje 1"
              value={state.speaker1Voice}
              onChange={(e) => onUpdate({ speaker1Voice: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onPreviewVoice(state.speaker1Voice)}
              disabled={previewingVoiceId === state.speaker1Voice}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shrink-0"
              title="Escuchar muestra de voz"
            >
              {previewingVoiceId === state.speaker1Voice ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
          </div>
        </div>

        {/* Speaker 2 */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
          <label className="block text-xs font-medium text-slate-600">Personaje 2</label>
          <input
            type="text"
            value={state.speaker2Name}
            onChange={(e) => onUpdate({ speaker2Name: e.target.value })}
            placeholder="Ej. Mateo"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
          />
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Voz del personaje 2"
              value={state.speaker2Voice}
              onChange={(e) => onUpdate({ speaker2Voice: e.target.value })}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onPreviewVoice(state.speaker2Voice)}
              disabled={previewingVoiceId === state.speaker2Voice}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shrink-0"
              title="Escuchar muestra de voz"
            >
              {previewingVoiceId === state.speaker2Voice ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dialogue Textarea */}
      <div className="space-y-1.5">
        <label htmlFor="dialogue-script" className="sr-only">
          Guion de diálogo con formato Nombre: texto
        </label>
        <textarea
          id="dialogue-script"
          rows={7}
          value={state.dialogueScript}
          onChange={(e) => onUpdate({ dialogueScript: e.target.value })}
          placeholder={`${state.speaker1Name.trim() || "Elena"}: Hola, ¿ya probaste el circuito?\n${state.speaker2Name.trim() || "Mateo"}: Sí, funciona perfecto.`}
          className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 resize-y min-h-[168px]"
        />
        <p className="text-xs text-slate-500">
          Usa una línea por intervención con formato <span className="font-mono">Nombre: texto</span>{" "}
          coincidiendo con los dos personajes arriba.
        </p>
      </div>
    </div>
  );
};
