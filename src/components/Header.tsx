import React from "react";
import { Plus } from "lucide-react";

export type StudioTab = "script" | "scenes" | "glossary" | "history";

interface HeaderProps {
  activeTab: StudioTab;
  onChangeTab: (tab: StudioTab) => void;
  sceneCount: number;
  historyCount: number;
  onCreateProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  sceneCount,
  historyCount,
  onCreateProject,
}) => {
  const navItems: Array<{ id: StudioTab; label: string }> = [
    { id: "script", label: "Guion y Dirección" },
    { id: "scenes", label: sceneCount > 0 ? `Escenas (${sceneCount})` : "Escenas y Diálogos" },
    { id: "glossary", label: "Glosario y Calidad" },
    { id: "history", label: historyCount > 0 ? `Historial (${historyCount})` : "Historial" },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          VozEscena Studio
        </span>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Secciones del estudio"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto h-full"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`h-full inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-blue-700 text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <button
          type="button"
          onClick={onCreateProject}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo proyecto</span>
        </button>
      </div>
    </header>
  );
};
