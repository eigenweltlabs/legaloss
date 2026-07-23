/**
 * House icon set: inline SVG, 1.6px stroke, round caps/joins, currentColor,
 * 20px box — 1.6px stroke house style.
 */
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17 17" />
    </svg>
  );
}

export function IconStar(
  props: SVGProps<SVGSVGElement> & { filled?: boolean },
) {
  const { filled, ...rest } = props;
  return (
    <svg {...base(rest)} fill={filled ? "currentColor" : "none"}>
      <path d="M10 2.8l2.2 4.5 4.9.7-3.6 3.5.9 4.9L10 14.1l-4.4 2.3.9-4.9L2.9 8l4.9-.7L10 2.8z" />
    </svg>
  );
}

export function IconFork(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="5.5" cy="4.5" r="2" />
      <circle cx="14.5" cy="4.5" r="2" />
      <circle cx="10" cy="15.5" r="2" />
      <path d="M5.5 6.5v1.5a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3V6.5M10 11v2.5" />
    </svg>
  );
}

export function IconIssue(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  );
}

export function IconGitHub(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden fill="currentColor" {...props}>
      <path d="M10 1.6a8.4 8.4 0 0 0-2.66 16.38c.42.08.58-.18.58-.4v-1.55c-2.34.5-2.83-.99-2.83-.99-.38-.97-.93-1.23-.93-1.23-.77-.52.06-.51.06-.51.85.06 1.29.86 1.29.86.75 1.29 1.98.92 2.46.7.08-.55.3-.92.53-1.13-1.87-.21-3.83-.93-3.83-4.15 0-.92.33-1.67.86-2.25-.08-.21-.37-1.07.08-2.22 0 0 .71-.23 2.31.86a8.06 8.06 0 0 1 4.2 0c1.6-1.09 2.3-.86 2.3-.86.46 1.15.17 2.01.09 2.22.54.58.86 1.33.86 2.25 0 3.23-1.97 3.94-3.84 4.15.3.26.57.77.57 1.55v2.3c0 .22.15.48.58.4A8.4 8.4 0 0 0 10 1.6z" />
    </svg>
  );
}

export function IconScale(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 3v14M6.5 17h7M10 3l-5 2m5-2 5 2" />
      <path d="M5 5 3 10a2.4 2.4 0 0 0 4 0L5 5zM15 5l-2 5a2.4 2.4 0 0 0 4 0l-2-5z" />
    </svg>
  );
}

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

export function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.5 4 5v4.5c0 4 2.6 6.6 6 8 3.4-1.4 6-4 6-8V5l-6-2.5z" />
      <path d="M7.5 9.8l2 2 3.2-3.6" />
    </svg>
  );
}

export function IconMessage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M17 12.5a1.8 1.8 0 0 1-1.8 1.8H7l-4 3.2V5.3a1.8 1.8 0 0 1 1.8-1.8h10.4A1.8 1.8 0 0 1 17 5.3v7.2z" />
    </svg>
  );
}

export function IconExternal(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 5H5a1.5 1.5 0 0 0-1.5 1.5V15A1.5 1.5 0 0 0 5 16.5h8.5A1.5 1.5 0 0 0 15 15v-3.5M11.8 3.5h4.7v4.7M16.2 3.8 9.5 10.5" />
    </svg>
  );
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5 5.8 16a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4l.8-10.5" />
    </svg>
  );
}

export function IconPencil(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M13.6 3.2a1.8 1.8 0 0 1 2.6 2.6l-9.4 9.4-3.6 1 1-3.6 9.4-9.4z" />
    </svg>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.2l2.6 1.6" />
    </svg>
  );
}
