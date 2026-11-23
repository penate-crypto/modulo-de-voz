import React, { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { GeneratedTake, PronunciationEntry, StudioProject } from "../types";

interface GlossaryAndQaViewProps {
  project: StudioProject;
  currentTake: GeneratedTake | null;
  onUpdateProject: (patch: Partial<StudioProject>) => void;
  onVerifyTranscription: () => void;
  isVerifyingQa: boolean;
}

export const GlossaryAndQaView: React.FC<GlossaryAndQaViewProps> = ({
  project,
  currentTake,
  onUpdateProject,
  onVerifyTranscription,
  isVerifyingQa,
}) => {
  const [newTerm, setNewTerm] = useState("");
  const [newSpoken, setNewSpoken] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const addEntry = (term: string, spokenForm: string, notes = "") => {
    if (!term.trim() || !spokenForm.trim()) return;
    const exists = project.glossary.some(
      (g) => g.term.toLowerCase() === term.trim().toLowerCase()
    );
    if (exists) return;

    const entry: PronunciationEntry = {
      id: `gloss_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      term: term.trim(),
      spokenForm: spokenForm.trim(),
      notes: notes.trim() || undefined,
    };
    onUpdateProject({ glossary: [entry, ...project.glossary] });
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    addEntry(newTerm, newSpoken, newNotes);
    setNewTerm("");
    setNewSpoken("");
    setNewNotes("");
  };

  const handleDeleteEntry = (id: string) => {
    onUpdateProject({
      glossary: project.glossary.filter((g) => g.id !== id),
    });
  };

  const detectedTerms = project.analysis?.detectedTechnicalTerms || [];

  return (
    <div className="space-y-6">
      {/* 1. Technical Pronunciation Glossary */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-950">
            Glosario de pronunciación y términos técnicos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define cómo deben leerse siglas, unidades eléctricas, símbolos, nombres propios o
            términos técnicos en español sin alterar el rigor del guion.
          </p>
        </div>

        {/* Detected terms from script analyzer */}
        {detectedTerms.length > 0 && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-xs font-semibold text-slate-900">
              Términos detectados en el guion actual (revisa antes de confirmar):
            </p>
            <div className="space-y-1.5">
              {detectedTerms.map((item, idx) => {
                const alreadyAdded = project.glossary.some(
                  (g) => g.term.toLowerCase() === item.term.toLowerCase()
                );
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 border-b border-slate-200/70 last:border-0"
                  >
                    <div className="text-slate-700">
                      <span className="font-mono font-semibold text-slate-950">{item.term}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-medium text-blue-800">{item.suggestedReading}</span>
                      <span className="text-slate-500 ml-2">({item.reason})</span>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() =>
                        addEntry(item.term, item.suggestedReading, item.reason)
                      }
                      className="text-xs font-medium text-blue-700 hover:text-blue-900 disabled:text-slate-400 cursor-pointer"
                    >
                      {alreadyAdded ? "En glosario" : "+ Agregar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Pronunciation Rule */}
        <form
          onSubmit={handleSubmitNew}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
        >
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Término / sigla escrita
            </label>
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="Ej. 240 V"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Lectura hablada deseada
            </label>
            <input
              type="text"
              value={newSpoken}
              onChange={(e) => setNewSpoken(e.target.value)}
              placeholder="Ej. doscientos cuarenta voltios"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Ej. Seguridad eléctrica"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!newTerm.trim() || !newSpoken.trim()}
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar</span>
            </button>
          </div>
        </form>

        {/* Glossary Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Escrito en guion</th>
                <th className="py-2.5 px-3 font-semibold">Pronunciación aplicada</th>
                <th className="py-2.5 px-3 font-semibold">Contexto</th>
                <th className="py-2.5 px-3 font-semibold text-right w-14">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.glossary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No hay reglas de pronunciación configuradas en este proyecto.
                  </td>
                </tr>
              ) : (
                project.glossary.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-950">
                      {entry.term}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{entry.spokenForm}</td>
                    <td className="py-2.5 px-3 text-slate-500">{entry.notes || "—"}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Clean Audio Mastering & Video Sync Margins */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-950">
            Márgenes de edición y limpieza de señal
          </h2>
        </div>

        <p className="text-xs text-slate-600">
          La pista se entrega completamente limpia (sin música de fondo, eco ni reverberación
          automática) respetando la frecuencia nativa de 24 kHz / 16-bit del motor.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Margen de silencio inicial (ms)
            </label>
            <input
              type="number"
              min={0}
              max={3000}
              step={50}
              value={project.leadInSilenceMs}
              onChange={(e) =>
                onUpdateProject({
                  leadInSilenceMs: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono tabular-nums text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Margen de silencio final (ms)
            </label>
            <input
              type="number"
              min={0}
              max={3000}
              step={50}
              value={project.leadOutSilenceMs}
              onChange={(e) =>
                onUpdateProject({
                  leadOutSilenceMs: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono tabular-nums text-slate-900"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={project.normalizeOutput}
                onChange={(e) =>
                  onUpdateProject({ normalizeOutput: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-300 text-blue-700"
              />
              <span className="text-slate-700 leading-snug">
                Normalizar pico consistente a{" "}
                <span className="font-mono">-1.5 dBFS</span> (evita recortes)
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* 3. Objective Post-Generation Audio QA & Transcription Check */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              Control de calidad objetivo y verificación
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mediciones reales sobre el archivo WAV generado y comparación opcional mediante{" "}
              <span className="font-mono">gemini-3.5-transcribe</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onVerifyTranscription}
            disabled={!currentTake?.wavBlob || isVerifyingQa}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-45 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
          >
            {isVerifyingQa ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            )}
            <span>
              {isVerifyingQa
                ? "Transcribiendo audio..."
                : "Verificar fidelidad por transcripción"}
            </span>
          </button>
        </div>

        {!currentTake?.quality ? (
          <p className="text-xs text-slate-500 py-3">
            Genera una toma de audio para inspeccionar su nivel RMS, pico, posibles recortes y
            ejecutar la comparación de transcripción.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Objective Signal Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-slate-100 text-xs">
              <div>
                <div className="text-slate-500">Formato nativo</div>
                <div className="font-mono tabular-nums font-semibold text-slate-950 mt-0.5">
                  {currentTake.quality.sampleRate / 1000} kHz · {currentTake.quality.bitDepth}-bit
                </div>
              </div>
              <div>
                <div className="text-slate-500">Duración medida</div>
                <div className="font-mono tabular-nums font-semibold text-slate-950 mt-0.5">
                  {currentTake.quality.durationSec.toFixed(2)} s
                </div>
              </div>
              <div>
                <div className="text-slate-500">Nivel RMS / Pico</div>
                <div className="font-mono tabular-nums font-semibold text-slate-950 mt-0.5">
                  {currentTake.quality.rmsDb} / {currentTake.quality.peakDb} dBFS
                </div>
              </div>
              <div>
                <div className="text-slate-500">Muestras saturadas</div>
                <div
                  className={`font-mono tabular-nums font-semibold mt-0.5 ${
                    currentTake.quality.clippedSamples > 12
                      ? "text-red-700"
                      : "text-emerald-700"
                  }`}
                >
                  {currentTake.quality.clippedSamples}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Silencio inicio / fin</div>
                <div className="font-mono tabular-nums font-semibold text-slate-950 mt-0.5">
                  {currentTake.quality.leadingSilenceMs} / {currentTake.quality.trailingSilenceMs} ms
                </div>
              </div>
            </div>

            {currentTake.quality.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                {currentTake.quality.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Transcription Verification Result */}
            {currentTake.qaResult && (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-950">
                    Coincidencia léxica estimada:{" "}
                    <span className="font-mono tabular-nums text-blue-700">
                      {currentTake.qaResult.wordMatchPercent}%
                    </span>
                  </span>
                  <span className="text-slate-500 font-mono tabular-nums">
                    Verificado {currentTake.qaResult.checkedAt}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  <strong>Transcripción recibida:</strong> “{currentTake.qaResult.transcript}”
                </p>
                {currentTake.qaResult.missingWords.length > 0 && (
                  <p className="text-amber-900">
                    <strong>Palabras con diferencia o ausentes en transcripción:</strong>{" "}
                    {currentTake.qaResult.missingWords.join(", ")}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">{currentTake.qaResult.note}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
