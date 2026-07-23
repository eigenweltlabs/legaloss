import type { CSSProperties } from "react";

type BorderBeamProps = {
  size?: number;
  ring?: number;
  radius?: number;
  delays?: number[];
  className?: string;
};

/** A soft white dot orbiting the 1px border ring of its (relative, isolated) host. */
export function BorderBeam({
  size = 140,
  ring = 1,
  radius = 24,
  delays = [0, -3],
  className,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`bb${className ? ` ${className}` : ""}`}
      style={
        {
          "--bb-size": `${size}px`,
          "--bb-ring": `${ring}px`,
          "--bb-radius": `${radius}px`,
        } as CSSProperties
      }
    >
      {delays.map((d, i) => (
        <div key={i} className="bb-beam" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}
