import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface LessonSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  initialDelayDays: number;
  initialHasHomework?: boolean;
  language: string;
  onSave?: () => void;
}

export default function LessonSettingsDialog({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  initialDelayDays,
  initialHasHomework = false,
  language,
  onSave,
}: LessonSettingsDialogProps) {
  const [delayDays, setDelayDays] = useState(initialDelayDays);
  const [hasHomework, setHasHomework] = useState(initialHasHomework);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDelayDays(initialDelayDays);
    setHasHomework(initialHasHomework);
  }, [initialDelayDays, initialHasHomework, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ 
          delay_days: delayDays,
          has_homework: hasHomework,
        })
        .eq('id', lessonId);

      if (error) throw error;

      toast.success(language === 'ru' ? 'Настройки сохранены' : 'Settings saved');
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lesson settings:', error);
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ru' ? 'Настройки урока' : 'Lesson Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground truncate">
            {lessonTitle}
          </p>

          <div className="space-y-2">
            <Label htmlFor="delay_days">
              {language === 'ru' 
                ? 'Через сколько дней после старта курса открыть урок' 
                : 'Days after course start to open lesson'}
            </Label>
            <Input
              id="delay_days"
              type="number"
              min={0}
              value={delayDays}
              onChange={(e) => setDelayDays(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              {language === 'ru' 
                ? '0 — урок доступен сразу. Старт курса — дата просмотра первого урока.' 
                : '0 — lesson available immediately. Course start = first lesson view date.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <Checkbox
              id="has_homework"
              checked={hasHomework}
              onCheckedChange={(checked) => setHasHomework(checked === true)}
            />
            <Label htmlFor="has_homework" className="cursor-pointer">
              {language === 'ru' ? 'Есть домашнее задание' : 'Has homework'}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ru' ? 'Отмена' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving 
              ? (language === 'ru' ? 'Сохранение...' : 'Saving...') 
              : (language === 'ru' ? 'Сохранить' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
