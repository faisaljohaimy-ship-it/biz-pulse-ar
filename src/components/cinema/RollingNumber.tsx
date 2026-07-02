import { useEffect, useRef, useState } from "react";

interface RollingNumberProps {
  value: number | string;
  className?: string;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
}

/**
 * Per-digit translateY roll animation. Non-numeric characters
 * (commas, dots, spaces) render as static separators.
 */
export function RollingNumber({ value, className = "", format, prefix, suffix }: RollingNumberProps) {
  const asNumber = typeof value === "number" ? value : Number(value);
  const formatted =
    format && Number.isFinite(asNumber)
      ? format(asNumber)
      : typeof value === "string"
        ? value
        : Number.isFinite(asNumber)
          ? asNumber.toLocaleString()
          : String(value);

  return (
    <span className={className} aria-label={String(formatted)}>
      {prefix}
      {formatted.split("").map((ch, i) =>
        /[0-9]/.test(ch) ? (
          <Digit key={`${i}-${ch}`} digit={Number(ch)} />
        ) : (
          <span key={`${i}-${ch}`} aria-hidden>
            {ch}
          </span>
        ),
      )}
      {suffix}
    </span>
  );
}

function Digit({ digit }: { digit: number }) {
  const [d, setD] = useState(digit);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setD(digit);
      return;
    }
    setD(digit);
  }, [digit]);

  return (
    <span className="nx-roll-digit" aria-hidden>
      <span
        className="nx-roll-track"
        style={{ transform: `translateY(-${d}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  );
}
