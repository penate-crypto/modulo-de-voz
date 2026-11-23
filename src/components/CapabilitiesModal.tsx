import React from "react";
import { X } from "lucide-react";
import { BackendCapabilities } from "../types";

interface CapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: BackendCapabilities | null;
}

export const CapabilitiesModal: React.FC<CapabilitiesModalProps> = ({
  isOpen,
  onClose,
  capabilities,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div
        role="dialog"
        aria-label="Capacidades y modelos del motor"
        className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Modelos activos y límites
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
          <div>
            TTS principal:{" "}
            <strong className="text-slate-950">
              {capabilities?.models.ttsDefault || "gemini-2.5-flash-preview-tts"}
            </strong>
          </div>
          <div>
            TTS Pro:{" "}
            <strong className="text-slate-950">
              {capabilities?.models.ttsPro || "gemini-2.5-pro-preview-tts"}
            </strong>
          </div>
          <div>
            Análisis / Transcripción:{" "}
            <strong className="text-slate-950">
              {capabilities?.models.scriptAnalysis || "gemini-2.5-flash"}
            </strong>
          </div>
          <div>
            Audio nativo:{" "}
            <strong className="text-slate-950">
              {capabilities?.nativeAudioFormat || "PCM 24 kHz · 16-bit Mono"}
            </strong>
          </div>
        </div>

        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 leading-relaxed">
          {(
            capabilities?.limitations || [
              "Usa exclusivamente voces originales predefinidas de Gemini TTS sin clonación.",
              "El modo de diálogo nativo admite exactamente 2 hablantes por llamada.",
              "Guiones largos se dividen automáticamente por oración y se unen en un solo archivo.",
              "No devuelve marcas de tiempo exactas por palabra ni sincronización labial automática.",
            ]
          ).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
