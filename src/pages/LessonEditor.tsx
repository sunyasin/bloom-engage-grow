import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/RichTextEditor';

type BlockType = 'text' | 'image' | 'checkbox' | 'input_text' | 'button' | 'link' | 'list' | 'video';

interface LessonBlock {
  id: string;
  block_type: BlockType;
  order_index: number | null;
  config_json: any;
}

interface Lesson {
  id: string;
  title: string;
  content_html: string | null;
  video_url: string | null;
  type: string;
  course_id: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const blocksToHtml = (blocks: LessonBlock[]) => {
  const parts: string[] = [];

  for (const block of blocks) {
    const config = block.config_json || {};

    switch (block.block_type) {
      case 'text': {
        const raw = String(config.content || '');
        // Preserve line breaks
        const html = escapeHtml(raw).replace(/\n/g, '<br/>');
        parts.push(`<p>${html}</p>`);
        break;
      }
      case 'image': {
        if (config.url) {
          const alt = escapeHtml(String(config.alt || ''));
          const src = String(config.url);
          parts.push(`<img src="${src}" alt="${alt}" />`);
        }
        break;
      }
      case 'video': {
        if (config.url) {
          const src = String(config.url);
          // TipTap doesn't have a generic video extension here, so keep as HTML.
          parts.push(
            `<video controls class="w-full rounded-lg"><source src="${src}" type="video/mp4"></video>`
          );
        }
        break;
      }
      // Non-text blocks: skip (they were previously interactive blocks)
      default:
        break;
    }
  }

  return parts.join('\n');
};

export default function LessonEditor() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (error || !data) {
      toast.error(language === 'ru' ? 'Урок не найден' : 'Lesson not found');
      navigate(`/course/${courseId}/preview`);
      setLoading(false);
      return;
    }

    // If WYSIWYG content is empty but legacy blocks exist, convert blocks -> HTML for preview/edit.
    const hasHtml = Boolean(data.content_html && String(data.content_html).trim().length > 0);
    if (!hasHtml) {
      const { data: blocksData } = await supabase
        .from('lesson_blocks')
        .select('id, block_type, order_index, config_json')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true });

      const blocks = (blocksData || []) as LessonBlock[];
      if (blocks.length > 0) {
        const htmlFromBlocks = blocksToHtml(blocks);
        setLesson({ ...(data as Lesson), content_html: htmlFromBlocks });
        setLoading(false);
        return;
      }
    }

    setLesson(data as Lesson);
    setLoading(false);
  }, [courseId, language, lessonId, navigate]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

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
