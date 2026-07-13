import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useState } from 'react';
import { I18nProvider } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { RulesModal } from '../components/RulesModal';
import { useI18n } from '../i18n';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}

function Shell() {
  const { t } = useI18n();
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <span className="text-lg font-bold text-emerald-400">{t('app.title')}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRulesOpen(true)}
            className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            {t('app.rules')}
          </button>
          <LanguageSwitcher />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}
