"use client";

export function ChipSelector({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  const isMd = size === "md";

  return (
    <div className={`flex flex-wrap ${isMd ? "gap-2" : "gap-1.5"}`}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`border transition-[border-color,background-color,color,transform] duration-150 active:scale-[0.97] ${
              isMd
                ? "rounded-xl px-4 py-3 text-left text-[12px] leading-5"
                : "rounded-[5px] px-2.5 py-1.5 text-[11px]"
            } ${
              selected
                ? "border-white/20 bg-white/8 font-medium text-white"
                : "border-white/8 bg-white/[0.02] text-secondary hover:border-white/15 hover:bg-white/4 hover:text-white"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function PriceInput({
  value,
  onChange,
  placeholder = "599.99 or 599-1099",
  inputClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-lg border border-white/10 bg-[#0c0d0e] transition-[border-color,box-shadow] duration-150 hover:border-white/15 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40">
      <span className="flex shrink-0 items-center border-r border-white/10 bg-white/[0.04] px-3 text-[13px] font-medium tabular-nums text-secondary">
        $
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent px-3 text-[14px] tabular-nums text-white outline-none placeholder:text-tertiary ${inputClassName}`}
      />
    </div>
  );
}
