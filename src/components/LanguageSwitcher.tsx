import { useI18n, Locale } from '../i18n';

const LOCALES: Locale[] = ['en', 'fr', 'es'];

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="flex gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition ${
            locale === l
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {t(`lang.${l}`)}
        </button>
      ))}
    </div>
  );
}
