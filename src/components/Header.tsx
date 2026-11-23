import React from "react";
import { History } from "lucide-react";

interface HeaderProps {
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ historyCount, onOpenHistory }) => {
  return (
    <header className="w-full max-w-[720px] mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between gap-4">
      <span className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap">
        VozEscena Studio
      </span>

      <button
        type="button"
        onClick={onOpenHistory}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
        aria-label="Abrir historial de audios"
      >
        <History className="w-3.5 h-3.5 text-slate-500" />
        <span>Historial{historyCount > 0 ? ` (${historyCount})` : ""}</span>
      </button>
    </header>
  );
};
