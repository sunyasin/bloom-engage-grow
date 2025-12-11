import { useI18n } from '@/lib/i18n';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => setLanguage('ru')}
        className={`px-2 py-1 rounded transition-smooth ${
          language === 'ru'
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        RUS
      </button>
      <span className="text-muted-foreground">/</span>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded transition-smooth ${
          language === 'en'
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        ENG
      </button>
    </div>
  );
};
