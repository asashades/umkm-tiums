// src/App.tsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UmkmProvider, useUmkm } from './context/UmkmContext';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { HomeworkBanner } from './components/layout/HomeworkBanner';
import { MockControlDrawer } from './components/layout/MockControlDrawer';
import { AccountStatusBanner } from './components/common/AccountStatusBanner';
import { LoginPage } from './components/auth/LoginPage';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { AdminConsole } from './components/admin/AdminConsole';
import { HppModule } from './components/modules/HppModule';
import { OrderModule } from './components/modules/OrderModule';
import { QualityHalalModule } from './components/modules/QualityHalalModule';
import { ReportModule } from './components/modules/ReportModule';
import { ProfileModule } from './components/modules/ProfileModule';
import { LecturerMonitoring } from './components/modules/LecturerMonitoring';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, isHpViewport, setIsHpViewport } = useUmkm();
  const { access } = useAuth();
  const [isMockDrawerOpen, setIsMockDrawerOpen] = useState(false);

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'hpp':
        return <HppModule />;
      case 'orders':
        return <OrderModule />;
      case 'quality':
        return <QualityHalalModule />;
      case 'reports':
        return <ReportModule />;
      case 'profile':
        return <ProfileModule />;
      case 'monitoring':
        // Hanya dapat diakses oleh Superadmin atau Admin yang ditugaskan
        if (!access.isAdmin) {
          return <HppModule />;
        }
        return <LecturerMonitoring />;
      case 'admin':
        // Hanya dapat diakses oleh Superadmin atau Admin yang ditugaskan
        if (!access.isAdmin) {
          return <HppModule />;
        }
        return (
          <AdminConsole
            onBack={() => setActiveTab('hpp')}
            onOpenClassroomMonitor={() => setActiveTab('monitoring')}
          />
        );
      default:
        return <HppModule />;
    }
  };

  // If mobile viewport preview mode is active, render inside a 375px smartphone frame
  if (isHpViewport) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-2 sm:p-4">
        <div className="text-center text-white text-xs mb-2 font-bold flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Simulasi Smartphone PWA (375px)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsHpViewport(false)}
            className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-expand text-[10px]"></i>
            <span>Kembali ke Layar Penuh</span>
          </button>
        </div>

        {/* Smartphone Shell (.hp-viewport forces mobile single-column layout and confines modals) */}
        <div className="hp-viewport w-[375px] max-w-full h-[min(780px,calc(100vh-52px))] bg-[#F1F5F9] rounded-[36px] border-[8px] border-slate-700 shadow-2xl overflow-hidden relative flex flex-col">
          {/* Top Speaker / Camera Notch */}
          <div className="bg-primary shrink-0 pt-1">
            <div className="w-28 h-3.5 bg-slate-800 rounded-b-xl mx-auto"></div>
          </div>

          {/* Sticky Top Header inside phone */}
          <div className="shrink-0 z-30">
            <Header onOpenMockDrawer={() => setIsMockDrawerOpen(true)} />
            <AccountStatusBanner />
          </div>

          {/* Screen Content Scrollable */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <HomeworkBanner />
            <main className="p-3 pb-24">{renderActiveModule()}</main>
          </div>

          {/* Bottom Docked Navigation Bar inside phone */}
          {activeTab !== 'monitoring' && activeTab !== 'admin' && <Navbar />}

          {/* Bottom Home Indicator Bar */}
          <div className="bg-canvas border-t border-hairline/60 py-1.5 shrink-0 z-40">
            <div className="w-28 h-1 bg-slate-400 rounded-full mx-auto"></div>
          </div>

          {/* Mock Control Drawer inside phone frame */}
          <MockControlDrawer
            isOpen={isMockDrawerOpen}
            onClose={() => setIsMockDrawerOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-body selection:bg-primary/20 selection:text-primary">
      <Header onOpenMockDrawer={() => setIsMockDrawerOpen(true)} />
      <AccountStatusBanner />
      <HomeworkBanner />

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 pt-4 md:pt-6 pb-28 sm:pb-24">
        {renderActiveModule()}
      </main>

      {/* Floating Bottom Navigation Bar (Hidden when on monitoring or admin page) */}
      {activeTab !== 'monitoring' && activeTab !== 'admin' && <Navbar />}

      {/* Mock Control Drawer */}
      <MockControlDrawer
        isOpen={isMockDrawerOpen}
        onClose={() => setIsMockDrawerOpen(false)}
      />
    </div>
  );
};

const AppGate: React.FC = () => {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-sm animate-pulse">
          <i className="fa-solid fa-industry text-xl"></i>
        </div>
        <p className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          Menghubungkan ke TITAN UMKM...
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Teknik Industri UMS</p>
      </div>
    );
  }

  // If not logged in and not guest, show LoginPage
  if (!user && !isGuest) {
    return <LoginPage />;
  }

  // If logged in via Google but hasn't completed onboarding, show OnboardingFlow
  if (user && !isGuest && !user.onboardingCompleted) {
    return <OnboardingFlow />;
  }

  // Main application
  return (
    <UmkmProvider>
      <MainAppContent />
    </UmkmProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
};

export default App;
