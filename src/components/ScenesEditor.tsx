import React from "react";
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Wand2,
  Loader2,
  Download,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { STYLES, VOICES } from "../data/studioCatalog";
import { SceneItem, VocalStyleId } from "../types";
import { formatDuration } from "../utils/audioUtils";

interface ScenesEditorProps {
  scenes: SceneItem[];
  canAnalyzeFromScript: boolean;
  isAnalyzing: boolean;
  playingSceneId: string | null;
  onAnalyzeScript: () => void;
  onAddScene: () => void;
  onUpdateScene: (sceneId: string, patch: Partial<SceneItem>) => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerateScene: (sceneId: string) => void;
  onTogglePlayScene: (scene: SceneItem) => void;
  onDownloadSceneWav: (scene: SceneItem) => void;
}

export const ScenesEditor: React.FC<ScenesEditorProps> = ({
  scenes,
  canAnalyzeFromScript,
  isAnalyzing,
  playingSceneId,
  onAnalyzeScript,
  onAddScene,
  onUpdateScene,
  onDeleteScene,
  onGenerateScene,
  onTogglePlayScene,
  onDownloadSceneWav,
}) => {
  return (
    <div className="space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-600">
          {scenes.length === 0
            ? "Divide tu guion en clips independientes o agrégalos manualmente."
            : `${scenes.length} escena(s) · Edita y genera cada una o únelas abajo.`}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAnalyzeScript}
            disabled={isAnalyzing || !canAnalyzeFromScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-medium text-slate-800 cursor-pointer"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>{isAnalyzing ? "Analizando…" : "Analizar guion con IA"}</span>
          </button>

          <button
            type="button"
            onClick={onAddScene}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar escena</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {scenes.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-200 bg-white text-center space-y-2">
          <p className="text-sm font-medium text-slate-800">Sin escenas todavía</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Pulsa “Analizar guion con IA” para dividir automáticamente el texto de la pestaña
            Narración, o crea tu primera escena manual.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenes.map((scene, idx) => {
            const isPlayingThis = playingSceneId === scene.id;
            return (
              <article
                key={scene.id}
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-medium text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => onUpdateScene(scene.id, { title: e.target.value })}
                      aria-label="Título de escena"
                      className="font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 px-1 py-0.5 w-36"
                    />
                    {scene.quality && (
                      <span className="font-mono tabular-nums text-emerald-700">
                        {formatDuration(scene.quality.durationSec)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {scene.audioWavUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => onTogglePlayScene(scene)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
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
                          onClick={() => onDownloadSceneWav(scene)}
                          className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-950 cursor-pointer"
                          title="Descargar WAV de esta escena"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onGenerateScene(scene.id)}
                      disabled={scene.status === "generating" || !scene.text.trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-medium text-slate-800 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          scene.status === "generating" ? "animate-spin" : ""
                        }`}
                      />
                      <span>
                        {scene.status === "generating"
                          ? "Generando…"
                          : scene.status === "ready"
                          ? "Regenerar"
                          : "Generar"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Eliminar escena"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={scene.text}
                  onChange={(e) => onUpdateScene(scene.id, { text: e.target.value })}
                  placeholder="Escribe el texto de esta escena..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/40 focus:bg-white text-sm text-slate-900 leading-relaxed resize-y"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <select
                    aria-label="Voz de la escena"
                    value={scene.voiceId}
                    onChange={(e) => onUpdateScene(scene.id, { voiceId: e.target.value })}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Estilo de la escena"
                    value={scene.styleId}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { styleId: e.target.value as VocalStyleId })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    {STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                {scene.status === "error" && scene.errorMessage && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {scene.errorMessage}
                    </span>
                    <button
                      type="button"
                      onClick={() => onGenerateScene(scene.id)}
                      className="underline font-medium shrink-0 cursor-pointer"
                    >
                      Reintentar
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
