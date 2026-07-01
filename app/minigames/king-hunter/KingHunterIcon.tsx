import React from "react";

export default function KingHunterIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="14"
        cy="10"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.45"
      />
      <circle cx="14" cy="10" r="2.7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 18.5h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.5 16.8h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12.5 6.2v2.2M11.4 7.3h2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7.7 6.7c.8-1 1.9-1.9 3.3-2.3.4-.1.8.3.7.7l-.4 2c-.1.3.1.6.4.6h1.1c.3 0 .5-.2.4-.5l-.3-2c-.1-.4.3-.8.7-.7 1.4.4 2.5 1.2 3.3 2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
