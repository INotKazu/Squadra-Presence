import { Crosshair, Shield, Sparkles } from "lucide-react";
import type { RoleId } from "../types";

interface RoleIconProps {
  role: RoleId;
  size?: "small" | "large";
}

export function RoleIcon({ role, size = "small" }: RoleIconProps) {
  const Icon = role === "damage" ? Crosshair : role === "tank" ? Shield : Sparkles;
  return (
    <span className={`role-icon role-icon--${role} role-icon--${size}`}>
      <Icon size={size === "large" ? 26 : 15} strokeWidth={2.4} />
    </span>
  );
}
