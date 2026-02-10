import React from "react";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
};

export default function DateInput({ value, onChange, className = "", min, max, disabled = false, name, id }: DateInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = ref.current as any;
    if (el && typeof el.showPicker === "function") {
      try { el.showPicker(); } catch {}
    }
  };

  return (
    <input
      ref={ref}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={openPicker}
      onClick={openPicker}
      className={className}
      min={min}
      max={max}
      disabled={disabled}
      name={name}
      id={id}
    />
  );
}
