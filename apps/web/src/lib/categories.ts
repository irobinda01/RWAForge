import { Briefcase, Building2, Factory, Package, Sprout, type LucideIcon } from "lucide-react";
import type { TokenCategory } from "@rwaforge/types";

export const CATEGORY_ICONS: Record<TokenCategory, LucideIcon> = {
  "Real Estate": Building2,
  Agriculture: Sprout,
  Business: Briefcase,
  Infrastructure: Factory,
  Other: Package,
};
