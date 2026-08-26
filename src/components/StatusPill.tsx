import type { LucideIcon } from "lucide-react";

interface StatusPillProps {
  icon: LucideIcon;
  label: string;
  tone?: "online" | "warning" | "muted" | "accent";
}

export function StatusPill({ icon: Icon, label, tone = "muted" }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <Icon size={13} strokeWidth={2.2} />
      {label}
    </span>
  );
}
