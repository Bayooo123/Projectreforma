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
  DollarSign,
  Bell,
  Settings,
  Receipt,
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

export const navigationGroups: NavGroup[] = [
  {
    label: 'Practice',
    color: '#059669',
    items: [
      { name: 'Briefs', href: '/briefs', icon: FileText },
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
      { name: 'Invoices', href: '/finance?tab=invoices', icon: Receipt },
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
