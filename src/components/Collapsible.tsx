import type { ReactNode } from 'react';

interface CollapsibleProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** אזור מתקפל — משמש למידע מתקדם כדי לא להעמיס על הממשק. */
export function Collapsible({ title, children, defaultOpen }: CollapsibleProps) {
  return (
    <details className="collapsible" open={defaultOpen}>
      <summary className="collapsible__summary">{title}</summary>
      <div className="collapsible__body">{children}</div>
    </details>
  );
}
