import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  RefreshCw,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { GeneratedTake } from "../types";
import { formatDuration } from "../utils/audioUtils";

interface MasterAudioDeckProps {
  currentTake: GeneratedTake | null;
  isPlaying: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  hasScenesReady: boolean;
  sceneCount: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onGenerateMaster: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onDownload: (format: "wav" | "mp3") => void;
  onVerifyQa: () => void;
  isVerifyingQa: boolean;
}

export const MasterAudioDeck: React.FC<MasterAudioDeckProps> = ({
  currentTake,
  isPlaying,
  isGenerating,
  canGenerate,
  sceneCount,
  currentTime,
  duration,
  volume,
  isMuted,
  onGenerateMaster,
  onTogglePlay,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onDownload,
  onVerifyQa,
  isVerifyingQa,
}) => {
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const bars =
    currentTake?.waveformPeaks && currentTake.waveformPeaks.length > 0
      ? currentTake.waveformPeaks
      : new Array(48).fill(8);

  return (
    <aside className="w-full xl:w-[348px] shrink-0 xl:sticky xl:top-20 space-y-4">
      <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 p-5 space-y-5">
        {/* Top Action Area — Single Dominant Primary CTA */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-200">Consola de masterización</span>
            {currentTake && (
              <span className="font-mono tabular-nums text-[11px]">
                {currentTake.sampleRate / 1000} kHz · {currentTake.bitDepth}-bit
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onGenerateMaster}
            disabled={isGenerating || !canGenerate}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando narración...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>
                  {sceneCount > 1
                    ? `Generar y ensamblar (${sceneCount} escenas)`
                    : currentTake
                    ? "Generar nueva toma"
                    : "Generar audio"}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Real PCM Waveform Monitor & Clickable Scrubber */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[200px]">
              {currentTake ? currentTake.modeName : "Sin toma cargada"}
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Clickable real waveform */}
          <div
            role="slider"
            aria-label="Línea de tiempo del audio"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={currentTake ? 0 : -1}
            onClick={(e) => {
              if (!currentTake || duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
              onSeek(ratio * duration);
            }}
            className="h-20 flex items-center gap-[3px] cursor-pointer select-none"
          >
            {bars.map((peak, idx) => {
              const barRatio = idx / bars.length;
              const isPassed = currentTake && barRatio <= progressRatio;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-xs transition-colors ${
                    !currentTake
                      ? "bg-slate-800"
                      : isPassed
                      ? "bg-blue-400"
                      : "bg-slate-600 hover:bg-slate-500"
                  }`}
                  style={{ height: `${Math.max(8, peak)}%` }}
                />
              );
            })}
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!currentTake}
                onClick={() => onSeek(Math.max(0, currentTime - 5))}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 flex items-center justify-center cursor-pointer"
                title="Retroceder 5 s"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={!currentTake}
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-lg bg-white hover:bg-slate-200 disabled:opacity-35 text-slate-950 flex items-center justify-center cursor-pointer"
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                disabled={!currentTake}
                onClick={() => onSeek(Math.min(duration, currentTime + 5))}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 flex items-center justify-center cursor-pointer"
                title="Adelantar 5 s"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label={isMuted ? "Activar sonido" : "Silenciar"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                aria-label="Volumen"
                className="w-16 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Dual Export Section (WAV for Editing + MP3 for Light Delivery) */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-slate-400">
            Exportación para edición audiovisual
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!currentTake?.wavBlob}
              onClick={() => onDownload("wav")}
              className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-35 text-slate-950 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>WAV (Edición)</span>
            </button>
            <button
              type="button"
              disabled={!currentTake?.wavBlob}
              onClick={() => onDownload("mp3")}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-100 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP3 (Ligero)</span>
            </button>
          </div>
        </div>

        {/* Objective Signal Summary & Quick QA */}
        {currentTake && (
          <div className="pt-3 border-t border-slate-800 space-y-2.5 text-[11px] text-slate-400">
            <div className="space-y-1">
              <div className="text-slate-200 font-medium truncate">
                {currentTake.styleName} · {currentTake.emotionSummary}
              </div>
              <div className="font-mono tabular-nums">
                Voces: {currentTake.voicesUsed.join(", ")} · Modelo: {currentTake.modelUsed}
              </div>
              {currentTake.quality && (
                <div className="font-mono tabular-nums text-slate-300">
                  RMS {currentTake.quality.rmsDb} dB · Pico {currentTake.quality.peakDb} dB ·{" "}
                  {currentTake.quality.clippedSamples === 0
                    ? "Sin recortes"
                    : `${currentTake.quality.clippedSamples} recorte(s)`}
                </div>
              )}
            </div>

            {currentTake.quality && currentTake.quality.warnings.length > 0 && (
              <div className="text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{currentTake.quality.warnings[0]}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onVerifyQa}
              disabled={isVerifyingQa}
              className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:bg-slate-900 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
            >
              {isVerifyingQa ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>
                {currentTake.qaResult
                  ? `Fidelidad estimada: ${currentTake.qaResult.wordMatchPercent}% (Re-verificar)`
                  : "Verificar con transcripción"}
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
