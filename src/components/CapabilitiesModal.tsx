import React from "react";
import { X, CheckCircle2, Info } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl max-h-[88vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              Capacidades reales y límites del motor de audio
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparencia técnica sobre los modelos conectados en el servidor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-semibold text-slate-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Modelos activos verificados
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-700">
              <li>
                Síntesis principal y diálogos:{" "}
                <strong>{capabilities?.models.flagshipTts || "gemini-3.8-flash-tts"}</strong>
              </li>
              <li>
                Síntesis rápida:{" "}
                <strong>{capabilities?.models.fastTts || "gemini-3.8-flash-lite-tts"}</strong>
              </li>
              <li>
                Análisis y dirección de guion:{" "}
                <strong>{capabilities?.models.scriptDirector || "gemini-4-hydrogen"}</strong>
              </li>
              <li>
                Verificación por transcripción:{" "}
                <strong>{capabilities?.models.transcriber || "gemini-3.5-transcribe"}</strong>
              </li>
              <li>
                Formato nativo de salida:{" "}
                <strong>{capabilities?.nativeAudioFormat || "WAV 24 kHz · 16-bit PCM Mono"}</strong>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-950 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-700" />
              Política de voces originales y limitaciones reales
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              {(
                capabilities?.limitations || [
                  "No se utiliza clonación de voz ni grabaciones del usuario; todas las narraciones usan voces originales predefinidas con dirección interpretativa.",
                  "El diálogo nativo simultáneo soporta exactamente 2 personajes por llamada; proyectos con 3 o más personajes se sintetizan por clip manteniendo la voz de cada personaje y se ensamblan automáticamente.",
                  "El motor no entrega marcas de tiempo exactas por palabra ni sincronización labial automática.",
                  "La exportación WAV conserva fielmente la frecuencia nativa de 24 kHz sin sobremuestreo artificial.",
                ]
              ).map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
