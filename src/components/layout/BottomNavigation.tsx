"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  FileText,
  Gavel,
  Plus,
  LayoutGrid,
  Search,
  X,
  Receipt,
  TrendingDown,
  UserPlus,
  CalendarPlus,
  ChevronRight,
} from 'lucide-react';
import styles from './BottomNavigation.module.css';
import { useState, useRef, useEffect } from 'react';
import { navigationGroups } from '@/config/navigation';

interface BottomNavigationProps {
  user?: {
    role?: string | null;
  };
  unreadNotifications?: number;
}

const BottomNavigation = ({ user }: BottomNavigationProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showFabSheet, setShowFabSheet] = useState(false);
  const [showHub, setShowHub] = useState(false);
  const [hubSearch, setHubSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  // Primary tab bar — daily-driver screens
  const primaryNav = [
    { name: 'Today', href: '/pulse', icon: Activity },
    { name: 'Briefs', href: '/briefs', icon: FileText },
  ];

  const secondaryNav = [
    { name: 'Court', href: '/calendar', icon: Gavel },
  ];

  // Dynamic hubGroups built from shared navigation config (F-01, F-05, F-08)
  const hubGroups = navigationGroups.map(group => ({
    label: group.label,
    color: group.color,
    items: group.items.filter(item => {
      if (item.adminOnly) {
        return isAdminOrOwner;
      }
      return true;
    }),
  }));

  // FAB Quick Create actions — all navigate, none are decoys (F-04 fixed)
  const createActions = [
    {
      name: 'New Brief',
      href: '/briefs',
      icon: FileText,
      color: '#059669',
      bg: '#ECFDF5',
      description: 'Open a new matter',
    },
    {
      name: 'New Court Date',
      href: '/calendar',
      icon: CalendarPlus,
      color: '#0369a1',
      bg: '#EFF6FF',
      description: 'Schedule a hearing',
    },
    {
      name: 'New Invoice',
      href: '/finance/invoices/new',
      icon: Receipt,
      color: '#7c3aed',
      bg: '#F5F3FF',
      description: 'Bill a client',
    },
    {
      name: 'Log Expense',
      href: '/management/office',
      icon: TrendingDown,
      color: '#dc2626',
      bg: '#FEF2F2',
      description: 'Record petty cash',
    },
    {
      name: 'Add Client',
      href: '/management/clients',
      icon: UserPlus,
      color: '#0891b2',
      bg: '#F0F9FF',
      description: 'Register a client',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/management') return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const allHubItems = hubGroups.flatMap(g => g.items);
  const isHubActive = allHubItems.some(item => isActive(item.href));

  const closeBoth = () => {
    setShowFabSheet(false);
    setShowHub(false);
    setHubSearch('');
  };

  // Search filter across all hub items (F-02 — restores global search on mobile)
  const filteredItems = hubSearch.trim()
    ? allHubItems.filter(item =>
        item.name.toLowerCase().includes(hubSearch.toLowerCase())
      )
    : null;

  // Auto-focus search when Hub opens
  useEffect(() => {
    if (showHub && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [showHub]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredItems && filteredItems.length > 0) {
      router.push(filteredItems[0].href);
      closeBoth();
    }
    if (e.key === 'Escape') {
      if (hubSearch) {
        setHubSearch('');
      } else {
        closeBoth();
      }
    }
  };

  return (
    <>
      {/* ── Quick Create Sheet (F-04 fixed) ───────────────────────────── */}
      {showFabSheet && (
        <div className={styles.sheetScrim} onClick={closeBoth}>
          <div className={styles.createSheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>Quick Create</span>
              <button className={styles.sheetClose} onClick={closeBoth}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.createList}>
              {createActions.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={styles.createItem}
                  onClick={closeBoth}
                >
                  <div
                    className={styles.createIcon}
                    style={{ background: action.bg }}
                  >
                    <action.icon size={20} color={action.color} />
                  </div>
                  <div className={styles.createInfo}>
                    <span className={styles.createName}>{action.name}</span>
                    <span className={styles.createDesc}>{action.description}</span>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hub Full-Screen Overlay (F-01 + F-02 + F-05) ─────────────── */}
      {showHub && (
        <div className={styles.hubOverlay}>
          {/* Search bar — restores global search (F-02) */}
          <div className={styles.hubHeader}>
            <div className={styles.hubSearchWrap}>
              <Search size={15} className={styles.hubSearchIcon} />
              <input
                ref={searchRef}
                type="text"
                className={styles.hubSearchInput}
                placeholder="Search all modules…"
                value={hubSearch}
                onChange={e => setHubSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
              {hubSearch && (
                <button
                  className={styles.hubSearchClear}
                  onClick={() => setHubSearch('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button className={styles.hubCloseBtn} onClick={closeBoth}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.hubContent}>
            {filteredItems ? (
              /* Search results */
              <div className={styles.hubGroup}>
                <p className={styles.hubGroupLabel}>
                  {filteredItems.length === 0
                    ? 'No results'
                    : `${filteredItems.length} module${filteredItems.length !== 1 ? 's' : ''} found`}
                </p>
                {filteredItems.length === 0 ? (
                  <p className={styles.hubEmpty}>
                    No modules match &ldquo;{hubSearch}&rdquo;
                  </p>
                ) : (
                  <div className={styles.hubGrid}>
                    {filteredItems.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.hubItem} ${isActive(item.href) ? styles.hubItemActive : ''}`}
                        onClick={closeBoth}
                      >
                        <item.icon size={22} />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Grouped view */
              hubGroups.map(group => (
                <div key={group.label} className={styles.hubGroup}>
                  <p
                    className={styles.hubGroupLabel}
                    style={{ color: group.color }}
                  >
                    {group.label}
                  </p>
                  <div className={styles.hubGrid}>
                    {group.items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.hubItem} ${isActive(item.href) ? styles.hubItemActive : ''}`}
                        onClick={closeBoth}
                      >
                        <item.icon size={22} />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Tab Bar ─────────────────────────────────────────────── */}
      <div className={styles.bottomNav}>
        <div className={styles.navItemsContainer}>
          {primaryNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              <item.icon size={22} className={styles.icon} />
              <span className={styles.label}>{item.name}</span>
            </Link>
          ))}

          {/* Centre FAB — Quick Create */}
          <div className={styles.fabContainer}>
            <button
              className={`${styles.fabButton} ${showFabSheet ? styles.fabActive : ''}`}
              onClick={() => {
                setShowFabSheet(v => !v);
                setShowHub(false);
                setHubSearch('');
              }}
            >
              <Plus size={24} />
            </button>
          </div>

          {secondaryNav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
            >
              <item.icon size={22} className={styles.icon} />
              <span className={styles.label}>{item.name}</span>
            </Link>
          ))}

          <button
            className={`${styles.navItem} ${styles.moreButton} ${
              isHubActive || showHub ? styles.active : ''
            }`}
            onClick={() => {
              setShowHub(v => !v);
              setShowFabSheet(false);
            }}
          >
            <LayoutGrid size={22} className={styles.icon} />
            <span className={styles.label}>Hub</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNavigation;
