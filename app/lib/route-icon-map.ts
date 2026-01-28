// app/lib/icon-map.ts
import {
  Calendar,
  Users,
  Settings,
  Home,
  UserCircle,
  Building2,
  ClipboardList,
  Clock,
  Bell,
  FolderKanban,
  Briefcase,
  LogIn,
  LogOut,
  Key,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP = {
  Calendar,
  Users,
  Settings,
  Home,
  UserCircle,
  Building2,
  ClipboardList,
  Clock,
  Bell,
  FolderKanban,
  Briefcase,
  LogIn,
  LogOut,
  Key,
  UserPlus,
} as const;

export type IconName = keyof typeof ICON_MAP;

export function getIcon(name?: IconName): LucideIcon | undefined {
  if (!name) return undefined;
  return ICON_MAP[name];
}
