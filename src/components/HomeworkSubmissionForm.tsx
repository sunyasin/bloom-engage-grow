import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Send, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface HomeworkSubmissionFormProps {
  lessonId: string;
  user: User | null;
  language: string;
}

interface HomeworkSubmission {
  id: string;
  content: string;
  status: 'ready' | 'ok' | 'reject';
  moderator_message: string | null;
  created_at: string;
  updated_at: string;
}

export default function HomeworkSubmissionForm({
  lessonId,
  user,
  language,
}: HomeworkSubmissionFormProps) {
  const [content, setContent] = useState('');
  const [submission, setSubmission] = useState<HomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Reset state when lesson changes
    setSubmission(null);
    setContent('');
    setLoading(true);

    const fetchSubmission = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch the most recent submission for this user and lesson
      const { data } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSubmission(data as HomeworkSubmission);
        // Only prefill content if rejected (for resubmission)
        if (data.status === 'reject') {
          setContent(data.content);
        }
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [lessonId, user]);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setSubmitting(true);
    try {
      // Always create new submission to preserve history
      const { data, error } = await supabase
        .from('homework_submissions')
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setSubmission(data as HomeworkSubmission);

      toast.success(
        language === 'ru' ? 'Домашнее задание отправлено' : 'Homework submitted'
      );
    } catch (error) {
      console.error('Error submitting homework:', error);
      toast.error(
        language === 'ru' ? 'Ошибка отправки' : 'Submission error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'reject':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok':
        return language === 'ru' ? 'Принято' : 'Accepted';
      case 'reject':
        return language === 'ru' ? 'Требует доработки' : 'Needs revision';
      default:
        return language === 'ru' ? 'На проверке' : 'Under review';
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            {language === 'ru' ? 'Домашнее задание' : 'Homework'}
          </Label>
          {submission && (
            <div className="flex items-center gap-2">
              {getStatusIcon(submission.status)}
              <span className="text-sm font-medium">
                {getStatusText(submission.status)}
              </span>
            </div>
          )}
        </div>

        {/* Moderator message for rejected submissions */}
        {submission?.status === 'reject' && submission.moderator_message && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>{language === 'ru' ? 'Комментарий:' : 'Comment:'}</strong>{' '}
              {submission.moderator_message}
            </p>
          </div>
        )}

        {/* Success message */}
        {submission?.status === 'ok' && (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              {language === 'ru'
                ? 'Ваше домашнее задание принято!'
                : 'Your homework has been accepted!'}
            </p>
          </div>
        )}

        {/* Input field - editable if no submission or rejected */}
        {(!submission || submission.status === 'reject') && (
          <>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                language === 'ru'
                  ? 'Введите ваш ответ...'
                  : 'Enter your answer...'
              }
              className="min-h-[120px]"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="bg-gradient-primary"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {language === 'ru' ? 'Отправить' : 'Submit'}
            </Button>
          </>
        )}

        {/* Show submitted content for ready status */}
        {submission?.status === 'ready' && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
