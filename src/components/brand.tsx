"use client";

/** Brand mark: two overlapping soft circles — mint & peach partners (PRD §83). */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span className="relative inline-block" style={{ width: size * 1.55, height: size }} aria-hidden>
      <span
        className="absolute left-0 top-[8%] rounded-full"
        style={{ width: size, height: size, background: "linear-gradient(145deg, var(--c-mint), var(--c-teal))", boxShadow: "var(--shadow-raised-sm)" }}
      />
      <span
        className="absolute right-0 top-[8%] rounded-full"
        style={{ width: size, height: size, background: "linear-gradient(145deg, var(--c-peach), var(--c-orange))", boxShadow: "var(--shadow-raised-sm)" }}
      />
      <span
        className="absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border-[3px]"
        style={{ width: size, height: size, borderColor: "var(--c-bg)" }}
      />
    </span>
  );
}

export function BrandName() {
  return (
    <span className="font-display text-lg font-bold tracking-tight text-ink">
      Our<span className="text-teal"> </span><span className="text-teal">Money</span>
    </span>
  );
}
