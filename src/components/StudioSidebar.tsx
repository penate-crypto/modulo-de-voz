import React, { useState } from "react";
import { FolderOpen, Info, Pencil, Trash2, Check, X } from "lucide-react";
import { PRODUCTION_MODES } from "../data/studioCatalog";
import { ProductionModeId, StudioProject } from "../types";

interface StudioSidebarProps {
  projects: StudioProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  activeModeId: ProductionModeId;
  onSelectMode: (modeId: ProductionModeId) => void;
  onOpenCapabilities: () => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  activeModeId,
  onSelectMode,
  onOpenCapabilities,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startRename = (project: StudioProject) => {
    setEditingId(project.id);
    setDraftName(project.name);
  };

  const commitRename = (id: string) => {
    if (draftName.trim()) {
      onRenameProject(id, draftName.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="w-full lg:w-[268px] shrink-0 space-y-6">
      {/* Projects Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            Proyectos
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">{projects.length}</span>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const isEditing = editingId === project.id;

            return (
              <div
                key={project.id}
                className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-950 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(project.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                    <button
                      type="button"
                      onClick={() => commitRename(project.id)}
                      className="p-1 text-slate-600 hover:text-slate-950 cursor-pointer"
                      aria-label="Guardar nombre"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="text-left truncate flex-1 cursor-pointer"
                    >
                      {project.name}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => startRename(project)}
                        className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                        title="Renombrar proyecto"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project.id)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8 Production Modes A-H */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-slate-900">Modos de producción</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajusta dirección vocal, ritmo y flujo de escenas.
          </p>
        </div>

        <div className="space-y-1">
          {PRODUCTION_MODES.map((mode) => {
            const isSelected = mode.id === activeModeId;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-blue-50 text-blue-950 ring-1 ring-inset ring-blue-200"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{mode.name}</span>
                  <span
                    className={`text-[11px] font-mono shrink-0 ${
                      isSelected ? "text-blue-700 font-medium" : "text-slate-400"
                    }`}
                  >
                    {mode.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                  {mode.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Honest Model Capabilities Link */}
      <button
        type="button"
        onClick={onOpenCapabilities}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:border-slate-300 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          Capacidades y límites del motor
        </span>
      </button>
    </aside>
  );
};
