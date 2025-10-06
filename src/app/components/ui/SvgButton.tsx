"use client";
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export default function SvgButton({ src, alt, width, height, selected, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center justify-center ${className || ""}`}
      aria-pressed={!!selected}
    >
      {/* selection ring */}
      {selected ? (
        <span className="absolute inset-[3px] rounded-[8px] ring-3 ring-sky-400 pointer-events-none" />
      ) : null}
      <img src={src} alt={alt} width={width} height={height} />
    </button>
  );
}

