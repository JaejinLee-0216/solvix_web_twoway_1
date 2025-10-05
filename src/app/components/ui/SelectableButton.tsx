"use client";
import { useState } from "react";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onSelect?: () => void;
};

export default function SelectableButton({ icon, title, subtitle, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const isSelected = !!selected;
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-3 px-5 py-3 rounded-[8px] bg-[#201C1C] transition-colors border ${
        isSelected ? "border-sky-400" : hovered ? "border-white/20" : "border-transparent"
      }`}
      aria-pressed={isSelected}
    >
      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6">{icon}</span>
      <span className="text-left leading-tight">
        <span className="block text-white font-semibold text-[14px] leading-[1.2]">{title}</span>
        {subtitle ? (
          <span className="block text-[11px] leading-[1.2] text-[#969393] mt-0.5">{subtitle}</span>
        ) : null}
      </span>
    </button>
  );
}

