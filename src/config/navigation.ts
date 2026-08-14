import {
  Activity,
  FileText,
  Gavel,
  Users,
  Briefcase,
  BarChart2,
  ShieldCheck,
  Terminal,
  Inbox,
  FolderInput,
  DollarSign,
  Bell,
  Settings,
  Bot,
  CalendarClock,
} from 'lucide-react';
import { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ size?: number | string; className?: string; color?: string }>;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  color: string;
  items: NavItem[];
}

export const todayItem: NavItem = {
  name: 'Today',
  href: '/pulse',
  icon: Activity,
};

// Pinned agent entry points — each opens a focused board on the Pulse page
// (via ?agent=) rather than a separate route, per the registry in
// src/lib/agents/registry.ts. Add a new item here when a new agent ships.
export const agentItems: NavItem[] = [
  { name: 'Brief Manager', href: '/pulse?agent=brief_manager', icon: Bot },
  { name: 'Meetings', href: '/pulse?agent=meetings', icon: CalendarClock },
];

export const navigationGroups: NavGroup[] = [
  {
    label: 'Practice',
    color: '#059669',
    items: [
      { name: 'Briefs', href: '/briefs', icon: FileText },
      { name: 'Inbox', href: '/inbox', icon: FolderInput },
      { name: 'Court & Calendar', href: '/calendar', icon: Gavel },
      { name: 'Clients', href: '/management/clients', icon: Users },
      { name: 'Compliance', href: '/management/compliance', icon: ShieldCheck },
    ],
  },
  {
    label: 'Money',
    color: '#7c3aed',
    items: [
      { name: 'Finance', href: '/finance', icon: DollarSign },
      { name: 'Analytics', href: '/analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Workspace',
    color: '#0369a1',
    items: [
      { name: 'Office Manager', href: '/management/office', icon: Briefcase },
      { name: 'Email Inbox', href: '/emails', icon: Inbox },
      { name: 'Notifications', href: '/notifications', icon: Bell },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'IT Management', href: '/management/it', icon: Terminal, adminOnly: true },
    ],
  },
];
