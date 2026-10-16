import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../lib/i18n";

type Props = {
  title: string;
  className?: string;
  children: ReactNode;
};

export function ExpandablePanel({ title, className = "", children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const wasExpanded = useRef(expanded);
  const { t } = useTranslation();
  const label = t(expanded ? "panel.collapse" : "panel.expand", { title });

  useEffect(() => {
    if (wasExpanded.current === expanded) return;
    wasExpanded.current = expanded;
    // Expanded cards move onto their own row. Keep their controls in view.
    headerRef.current?.scrollIntoView({ block: expanded ? "start" : "nearest", behavior: "instant" });
  }, [expanded]);

  return (
    <section
      className={`panel expandable-panel ${expanded ? "expandable-panel--expanded" : ""} ${className}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          setExpanded(false);
        }
      }}
    >
      <div className="expandable-panel-header" ref={headerRef}>
        <h3>{title}</h3>
        <button
          type="button"
          className="icon-btn panel-expand-toggle"
          title={label}
          aria-label={label}
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={expanded
              ? "M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"
              : "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"} />
          </svg>
        </button>
      </div>
      {children}
    </section>
  );
}
