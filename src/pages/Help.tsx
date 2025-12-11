import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, MessageSquare, Book, Settings } from 'lucide-react';

export default function Help() {
  const { t, language } = useI18n();

  const sections = [
    {
      icon: MessageSquare,
      title: language === 'ru' ? 'Сообщества' : 'Communities',
      content: language === 'ru' 
        ? 'Присоединяйтесь к сообществам, чтобы общаться с единомышленниками и получать доступ к эксклюзивному контенту.'
        : 'Join communities to connect with like-minded people and access exclusive content.'
    },
    {
      icon: Book,
      title: language === 'ru' ? 'Курсы' : 'Courses',
      content: language === 'ru'
        ? 'Проходите курсы и отслеживайте свой прогресс. Выполняйте задания и тесты.'
        : 'Take courses and track your progress. Complete assignments and tests.'
    },
    {
      icon: Settings,
      title: language === 'ru' ? 'Настройки профиля' : 'Profile Settings',
      content: language === 'ru'
        ? 'Настройте свой профиль, загрузите аватар и расскажите о себе.'
        : 'Customize your profile, upload an avatar, and tell others about yourself.'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            {t('nav.help')}
          </h1>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
