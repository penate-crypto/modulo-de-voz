import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "./components/Header";
import { NarrationEditor } from "./components/NarrationEditor";
import { DialogueEditor } from "./components/DialogueEditor";
import { ScenesEditor } from "./components/ScenesEditor";
import { AudioPlayer } from "./components/AudioPlayer";
import { AdvancedOptions } from "./components/AdvancedOptions";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { CapabilitiesModal } from "./components/CapabilitiesModal";
import { QUICK_EXAMPLES } from "./data/studioCatalog";
import { WorkspaceMode } from "./types";
import { useStudioState } from "./hooks/useStudioState";
import { useAudioGeneration } from "./hooks/useAudioGeneration";

const MODE_TABS: Array<{ id: WorkspaceMode; label: string }> = [
  { id: "narration", label: "Narración" },
  { id: "dialogue", label: "Diálogo 2 voces" },
  { id: "scenes", label: "Por escenas" },
];

export function App() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCapsOpen, setIsCapsOpen] = useState(false);

  const studio = useStudioState();
  const gen = useAudioGeneration({
    stateRef: studio.stateRef,
    setState: studio.setState,
    setTakes: studio.setTakes,
    setErrorMessage: studio.setErrorMessage,
    updateScene: studio.updateScene,
    playTakeInMaster: studio.playTakeInMaster,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-slate-900">
      <audio
        ref={studio.masterAudioRef}
        onTimeUpdate={() =>
          studio.masterAudioRef.current &&
          studio.setCurrentTime(studio.masterAudioRef.current.currentTime)
        }
        onLoadedMetadata={() => {
          if (
            studio.masterAudioRef.current &&
            Number.isFinite(studio.masterAudioRef.current.duration)
          ) {
            studio.setDuration(studio.masterAudioRef.current.duration);
          }
        }}
        onEnded={() => {
          studio.setIsPlaying(false);
          studio.setCurrentTime(0);
        }}
      />
      <audio ref={studio.auxAudioRef} onEnded={() => studio.setPlayingSceneId(null)} />

      <Header
        historyCount={studio.takes.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="w-full max-w-[720px] mx-auto px-4 sm:px-6 pb-16 flex-1 space-y-5">
        {/* Compact 3-mode tabs + subtle example loader */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Modo de trabajo"
            className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200/70"
          >
            {MODE_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={studio.state.mode === tab.id}
                onClick={() => studio.updateState({ mode: tab.id })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  studio.state.mode === tab.id
                    ? "bg-white text-slate-950 border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Cargar ejemplo"
            value=""
            onChange={(e) => {
              const ex = QUICK_EXAMPLES[Number(e.target.value)];
              if (!ex) return;
              if (ex.mode === "dialogue") {
                studio.updateState({
                  mode: "dialogue",
                  dialogueScript: ex.text,
                  styleId: ex.styleId,
                });
              } else {
                studio.updateState({
                  mode: "narration",
                  script: ex.text,
                  styleId: ex.styleId,
                  voiceId: ex.voiceId,
                });
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 cursor-pointer"
          >
            <option value="">Cargar ejemplo…</option>
            {QUICK_EXAMPLES.map((ex, i) => (
              <option key={ex.label} value={i}>
                {ex.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active mode editor */}
        {studio.state.mode === "narration" && (
          <NarrationEditor
            state={studio.state}
            previewingVoiceId={studio.previewingVoiceId}
            onUpdate={studio.updateState}
            onPreviewVoice={studio.handlePreviewVoice}
          />
        )}

        {studio.state.mode === "dialogue" && (
          <DialogueEditor
            state={studio.state}
            onUpdate={studio.updateState}
            previewingVoiceId={studio.previewingVoiceId}
            onPreviewVoice={studio.handlePreviewVoice}
          />
        )}

        {studio.state.mode === "scenes" && (
          <ScenesEditor
            scenes={studio.state.scenes}
            canAnalyzeFromScript={Boolean(
              studio.state.script.trim() || studio.state.dialogueScript.trim()
            )}
            isAnalyzing={gen.isAnalyzing}
            playingSceneId={studio.playingSceneId}
            onAnalyzeScript={gen.handleAnalyzeScenes}
            onAddScene={studio.addScene}
            onUpdateScene={studio.updateScene}
            onDeleteScene={studio.deleteScene}
            onGenerateScene={gen.handleGenerateScene}
            onTogglePlayScene={studio.handleTogglePlayScene}
            onDownloadSceneWav={studio.handleDownloadSceneWav}
          />
        )}

        {/* Single Large Primary CTA */}
        <button
          type="button"
          onClick={gen.handleGenerateMain}
          disabled={gen.isGenerating}
          className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-55 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {gen.isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>
            {gen.isGenerating
              ? gen.genStatus
              : studio.state.mode === "scenes"
              ? "Unir todo en un master"
              : "Generar audio"}
          </span>
        </button>

        {/* Inline Player & Error Banner */}
        <AudioPlayer
          take={studio.activeTake}
          isPlaying={studio.isPlaying}
          currentTime={studio.currentTime}
          duration={studio.duration}
          errorMessage={studio.errorMessage}
          onRetry={gen.handleGenerateMain}
          onDismissError={() => studio.setErrorMessage(null)}
          onTogglePlay={studio.handleTogglePlayMaster}
          onSeek={studio.handleSeekMaster}
          onDownload={(fmt) =>
            studio.activeTake && studio.handleDownloadTake(studio.activeTake, fmt)
          }
          onVerifyQa={studio.handleVerifyQa}
          isVerifyingQa={studio.isVerifyingQa}
        />

        {/* Collapsible Advanced Options (closed by default) */}
        <AdvancedOptions state={studio.state} onUpdate={studio.updateState} />
      </main>

      <footer className="w-full max-w-[720px] mx-auto px-4 sm:px-6 py-5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
        <span>VozEscena Studio</span>
        <button
          type="button"
          onClick={() => setIsCapsOpen(true)}
          className="hover:text-slate-900 underline underline-offset-2 cursor-pointer"
        >
          Capacidades y límites del motor
        </button>
      </footer>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        takes={studio.takes}
        activeTakeId={studio.activeTakeId}
        isPlaying={studio.isPlaying}
        onPlayTake={(t) => {
          if (studio.activeTakeId === t.id && studio.isPlaying) {
            studio.masterAudioRef.current?.pause();
            studio.setIsPlaying(false);
          } else {
            studio.playTakeInMaster(t, true);
          }
        }}
        onDownloadTake={studio.handleDownloadTake}
        onDeleteTake={studio.handleDeleteTake}
        onClearAll={studio.handleClearAllTakes}
      />

      <CapabilitiesModal
        isOpen={isCapsOpen}
        onClose={() => setIsCapsOpen(false)}
        capabilities={studio.capabilities}
      />
    </div>
  );
}

export default App;
