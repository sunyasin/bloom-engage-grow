import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Video, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface VideoUploaderProps {
  lessonId: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function VideoUploader({ 
  lessonId, 
  currentUrl, 
  onUploadComplete,
  className 
}: VideoUploaderProps) {
  const { language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ];

  const maxFileSize = 500 * 1024 * 1024; // 500MB

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        language === 'ru' 
          ? 'Неподдерживаемый формат. Используйте MP4, WebM, MOV или AVI' 
          : 'Unsupported format. Use MP4, WebM, MOV or AVI'
      );
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(
        language === 'ru' 
          ? 'Файл слишком большой. Максимум 500MB' 
          : 'File too large. Maximum 500MB'
      );
      return;
    }

    setFileName(file.name);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${lessonId}/${Date.now()}.${fileExt}`;

      // Simulate progress for better UX (Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setStatus('success');

      // Store the path (not full URL) for signed URL generation later
      onUploadComplete(filePath);

      toast.success(
        language === 'ru' ? 'Видео загружено' : 'Video uploaded'
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      toast.error(
        language === 'ru' 
          ? `Ошибка загрузки: ${error.message}` 
          : `Upload error: ${error.message}`
      );
    }
  }, [lessonId, language, onUploadComplete]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleCancel = useCallback(() => {
    setStatus('idle');
    setUploadProgress(0);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === 'idle' && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
          onClick={openFileDialog}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Video className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">
            {language === 'ru' 
              ? 'Перетащите видео или нажмите для выбора' 
              : 'Drag video or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            MP4, WebM, MOV, AVI • {language === 'ru' ? 'до' : 'up to'} 500MB
          </p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ru' ? 'Загрузка...' : 'Uploading...'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {language === 'ru' ? 'Загружено успешно' : 'Uploaded successfully'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openFileDialog}
            >
              {language === 'ru' ? 'Заменить' : 'Replace'}
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {language === 'ru' ? 'Ошибка загрузки' : 'Upload failed'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openFileDialog}
            >
              {language === 'ru' ? 'Повторить' : 'Retry'}
            </Button>
          </div>
        </div>
      )}

      {currentUrl && status === 'idle' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="w-3 h-3 text-green-500" />
          <span>{language === 'ru' ? 'Видео уже загружено' : 'Video already uploaded'}</span>
        </div>
      )}
    </div>
  );
}
