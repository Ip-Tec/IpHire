import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = '', iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-deepsea-500 to-deepsea-800 shadow-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {/* Career path arrow */}
          <path d="M3 19h4l6-12h4" />
          <polyline points="14 5 19 5 19 10" />
          <circle cx="3" cy="19" r="1.5" fill="white" stroke="none" />
          <circle cx="19" cy="5" r="1.5" fill="white" stroke="none" />
        </svg>
        {/* Pulse dot */}
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-deepsea-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-deepsea-200" />
        </span>
      </div>

      {!iconOnly && (
        <div className="leading-none">
          <p className="text-lg font-extrabold tracking-tight text-foreground">
            Ip<span className="text-deepsea-600 dark:text-deepsea-400">Hire</span>
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Career OS
          </p>
        </div>
      )}
    </div>
  );
}
