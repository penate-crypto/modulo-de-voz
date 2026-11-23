import React from "react";
import { X, Play, Pause, Download, Trash2 } from "lucide-react";
import { GeneratedTake } from "../types";
import { formatDuration } from "../utils/audioUtils";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  takes: GeneratedTake[];
  activeTakeId: string | null;
  isPlaying: boolean;
  onPlayTake: (take: GeneratedTake) => void;
  onDownloadTake: (take: GeneratedTake, format: "wav" | "mp3") => void;
  onDeleteTake: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  takes,
  activeTakeId,
  isPlaying,
  onPlayTake,
  onDownloadTake,
  onDeleteTake,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
      <div
        role="dialog"
        aria-label="Historial de audios generados"
        className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Historial de tomas</h2>
            <p className="text-xs text-slate-500">
              {takes.length} audio(s) generado(s)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {takes.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-slate-500 hover:text-red-600 cursor-pointer"
              >
                Vaciar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
              aria-label="Cerrar historial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {takes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Aún no hay audios en el historial de esta sesión.
            </div>
          ) : (
            takes.map((take) => {
              const isActive = activeTakeId === take.id;
              const isPlayingThis = isActive && isPlaying;
              const playable = Boolean(take.wavBlob || take.wavUrl);

              return (
                <div
                  key={take.id}
                  className={`p-4 space-y-2.5 ${isActive ? "bg-blue-50/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {take.voiceSummary} · {take.styleName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        {take.createdAt} · {formatDuration(take.durationSec)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteTake(take.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      aria-label="Eliminar toma"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
                    {take.textForQa}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      disabled={!playable}
                      onClick={() => onPlayTake(take)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-white text-xs font-medium cursor-pointer"
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
                      disabled={!playable}
                      onClick={() => onDownloadTake(take, "wav")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      WAV
                    </button>

                    <button
                      type="button"
                      disabled={!playable}
                      onClick={() => onDownloadTake(take, "mp3")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-35 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      MP3
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
