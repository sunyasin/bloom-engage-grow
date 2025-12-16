import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/RichTextEditor';

interface Lesson {
  id: string;
  title: string;
  content_html: string | null;
  video_url: string | null;
  type: string;
  course_id: string;
}

export default function LessonEditor() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId]);

  const fetchLesson = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      toast.error(language === 'ru' ? 'Урок не найден' : 'Lesson not found');
      navigate(`/course/${courseId}/preview`);
    } else {
      setLesson(data);
    }
    setLoading(false);
  };

  const saveLesson = async () => {
    if (!lesson) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('lessons')
      .update({
        title: lesson.title,
        content_html: lesson.content_html,
        video_url: lesson.video_url
      })
      .eq('id', lessonId);

    if (error) {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save error');
    } else {
      toast.success(language === 'ru' ? 'Сохранено' : 'Saved');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${courseId}/preview`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <Input
            value={lesson?.title || ''}
            onChange={(e) => setLesson(lesson ? { ...lesson, title: e.target.value } : null)}
            className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
            placeholder={language === 'ru' ? 'Название урока' : 'Lesson title'}
          />
        </div>
        <Button onClick={saveLesson} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? (language === 'ru' ? 'Сохранение...' : 'Saving...') : t('common.save')}
        </Button>
      </div>

      <RichTextEditor
        content={lesson?.content_html || ''}
        onChange={(html) => setLesson(lesson ? { ...lesson, content_html: html } : null)}
        language={language}
        placeholder={language === 'ru' ? 'Начните писать содержимое урока...' : 'Start writing lesson content...'}
        lessonId={lessonId}
      />
    </div>
  );
}
