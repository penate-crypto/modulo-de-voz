import React from "react";
import { Play, Pause, Download, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { GeneratedTake } from "../types";
import { formatDuration } from "../utils/audioUtils";

interface AudioPlayerProps {
  take: GeneratedTake | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  errorMessage: string | null;
  onRetry: () => void;
  onDismissError: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onDownload: (format: "wav" | "mp3") => void;
  onVerifyQa: () => void;
  isVerifyingQa: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  take,
  isPlaying,
  currentTime,
  duration,
  errorMessage,
  onRetry,
  onDismissError,
  onTogglePlay,
  onSeek,
  onDownload,
  onVerifyQa,
  isVerifyingQa,
}) => {
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Discrete error notice with Retry */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-red-200 bg-red-50/80 text-red-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{errorMessage}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={onDismissError}
              className="text-xs text-red-700 hover:text-red-950 px-1.5 py-1 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Simple Audio Player */}
      {take && (
        <section
          aria-label="Reproductor de audio generado"
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!take.wavUrl}
              className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-800 truncate">
                  {take.voiceSummary} · {take.styleName}
                </span>
                <span className="font-mono tabular-nums text-slate-500 shrink-0">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div
                role="slider"
                aria-label="Progreso del audio"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                onClick={(e) => {
                  if (duration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                  onSeek(ratio * duration);
                }}
                className="h-2 w-full bg-slate-100 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-blue-600 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onDownload("wav")}
                disabled={!take.wavBlob}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar WAV</span>
              </button>

              <button
                type="button"
                onClick={() => onDownload("mp3")}
                disabled={!take.wavBlob}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 text-xs font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar MP3</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onVerifyQa}
              disabled={!take.wavBlob || isVerifyingQa}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
            >
              {isVerifyingQa ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>
                {take.qaResult
                  ? `Fidelidad: ${take.qaResult.wordMatchPercent}%`
                  : "Verificar transcripción"}
              </span>
            </button>
          </div>

          {take.qaResult && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
              <div className="text-slate-700">
                <strong className="text-slate-900">Transcripción:</strong> “{take.qaResult.transcript}”
              </div>
              {take.qaResult.missingWords.length > 0 && (
                <div className="text-amber-800">
                  Diferencias detectadas: {take.qaResult.missingWords.join(", ")}
                </div>
              )}
              <div className="text-[11px] text-slate-500">{take.qaResult.note}</div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
