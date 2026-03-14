import React from 'react';
import { CogIcon } from '../components/Icons';
import AccountingDashboard from '../components/AccountingDashboard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import UserMenu from '../components/UserMenu';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslations } from '../context/LanguageContext';

const AccountingPage: React.FC = () => {
  const { setView } = useApp();
  const { currentTheme } = useTheme();
  const { t } = useTranslations();

  return (
    <>
      <main className="flex flex-col h-screen" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: currentTheme.colors.borderColor, backgroundColor: currentTheme.colors.bgSecondary }}
        >
          <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.textPrimary }}>
            💰 {t('accounting.title') || 'Accounting Dashboard'}
          </h1>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button onClick={() => setView('settings')} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors" aria-label={t('settings.title')}>
              <CogIcon className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-gray-700 mx-1"></div>
            <UserMenu />
          </div>
        </header>

        {/* Content */}
        <div className="flex-grow min-h-0 overflow-auto p-4">
          <AccountingDashboard />
        </div>
      </main>
    </>
  );
};

export default AccountingPage;
