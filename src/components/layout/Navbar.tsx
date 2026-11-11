import React from 'react';
import { useUmkm, ActiveTab } from '../../context/UmkmContext';

interface TabItem {
  id: ActiveTab;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'hpp', label: 'Produk & HPP', icon: 'fa-solid fa-boxes-stacked' },
  { id: 'orders', label: 'Pesanan', icon: 'fa-solid fa-clipboard-list' },
  { id: 'quality', label: 'Mutu & Halal', icon: 'fa-solid fa-shield-halved' },
  { id: 'reports', label: 'Rapor', icon: 'fa-solid fa-chart-simple' },
  { id: 'profile', label: 'Profil', icon: 'fa-solid fa-sliders' },
];

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, isHpViewport } = useUmkm();

  return (
    <nav
      className={`${
        isHpViewport
          ? 'absolute bottom-5 left-0 right-0 z-40 flex justify-center px-2.5 pointer-events-none'
          : 'fixed bottom-4 left-0 right-0 z-40 flex justify-center px-3 pointer-events-none'
      }`}
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-hairline/90 rounded-full px-2 py-1.5 shadow-nav flex items-center gap-0.5 max-w-md w-full justify-between">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              className={`flex items-center justify-center transition-pill select-none min-h-[42px] ${
                isActive
                  ? 'bg-primary text-white rounded-full px-3.5 py-2 gap-1.5 shadow-micro font-bold text-xs'
                  : 'text-muted hover:text-ink px-2.5 py-2 rounded-full text-base hover:bg-neutral-1'
              }`}
              type="button"
            >
              <i className={`${tab.icon} ${isActive ? 'text-xs' : 'text-base'}`}></i>
              {isActive && (
                <span className="whitespace-nowrap tracking-tight">{tab.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
