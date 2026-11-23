import React, { useState } from "react";
import { Play, Pause, Download, Trash2, Search } from "lucide-react";
import { GeneratedTake } from "../types";
import { formatDuration } from "../utils/audioUtils";

interface TakeHistoryViewProps {
  takes: GeneratedTake[];
  activeProjectId: string;
  currentTakeId: string | null;
  isPlaying: boolean;
  onPlayTake: (take: GeneratedTake) => void;
  onDownloadTake: (take: GeneratedTake, format: "wav" | "mp3") => void;
  onDeleteTake: (id: string) => void;
  onClearHistory: () => void;
}

export const TakeHistoryView: React.FC<TakeHistoryViewProps> = ({
  takes,
  activeProjectId,
  currentTakeId,
  isPlaying,
  onPlayTake,
  onDownloadTake,
  onDeleteTake,
  onClearHistory,
}) => {
  const [scope, setScope] = useState<"project" | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = takes.filter((t) => {
    if (scope === "project" && t.projectId !== activeProjectId) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.filenameBase.toLowerCase().includes(q) ||
      t.projectName.toLowerCase().includes(q) ||
      t.textExcerpt.toLowerCase().includes(q) ||
      t.modeName.toLowerCase().includes(q)
    );
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-950">Historial de tomas generadas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reproduce tomas anteriores de la sesión o descárgalas en WAV sin compresión o MP3.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                scope === "all"
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Todos los proyectos
            </button>
            <button
              type="button"
              onClick={() => setScope("project")}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                scope === "project"
                  ? "bg-white text-slate-950 shadow-2xs"
                  : "text-slate-600"
              }`}
            >
              Proyecto actual
            </button>
          </div>

          {takes.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1 cursor-pointer"
            >
              Vaciar historial
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por proyecto, modo, archivo o fragmento de texto..."
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
        />
      </div>

      {/* High-density Table */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500">
          {takes.length === 0
            ? "Todavía no has generado tomas de audio en esta sesión."
            : "Ninguna toma coincide con el filtro actual."}
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 font-semibold w-10"></th>
                <th className="py-2.5 px-3 font-semibold">Toma y guion</th>
                <th className="py-2.5 px-3 font-semibold">Dirección y voces</th>
                <th className="py-2.5 px-3 font-semibold text-right">Duración</th>
                <th className="py-2.5 px-3 font-semibold text-right">Exportación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((take) => {
                const isCurrent = currentTakeId === take.id;
                const isActivePlaying = isCurrent && isPlaying;
                const hasAudioInSession = Boolean(take.wavBlob || take.wavUrl);

                return (
                  <tr
                    key={take.id}
                    className={`transition-colors ${
                      isCurrent ? "bg-blue-50/50" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        disabled={!hasAudioInSession}
                        onClick={() => onPlayTake(take)}
                        className="w-7 h-7 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-white flex items-center justify-center cursor-pointer"
                        title={
                          hasAudioInSession
                            ? isActivePlaying
                              ? "Pausar"
                              : "Reproducir"
                            : "Audio disponible solo durante la sesión activa"
                        }
                      >
                        {isActivePlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 translate-x-0.5" />
                        )}
                      </button>
                    </td>

                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold text-slate-950 truncate">
                        {take.projectName} · {take.createdAt}
                      </div>
                      <p className="text-slate-500 truncate mt-0.5">{take.textExcerpt}</p>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      <div>
                        {take.modeName} · {take.styleName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Voces: {take.voicesUsed.join(", ")}
                        {take.segmentCount > 1 ? ` · ${take.segmentCount} escenas` : ""}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatDuration(take.durationSec)}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!hasAudioInSession}
                          onClick={() => onDownloadTake(take, "wav")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 text-[11px] font-medium text-slate-800 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          WAV
                        </button>
                        <button
                          type="button"
                          disabled={!hasAudioInSession}
                          onClick={() => onDownloadTake(take, "mp3")}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 text-[11px] font-medium text-slate-800 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          MP3
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTake(take.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Eliminar toma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
