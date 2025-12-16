import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, ImageIcon, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface ImageUploaderProps {
  lessonId: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function ImageUploader({ 
  lessonId, 
  currentUrl, 
  onUploadComplete,
  className 
}: ImageUploaderProps) {
  const { language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>(currentUrl ? 'success' : 'idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [dragActive, setDragActive] = useState(false);

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const uploadFile = useCallback(async (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        language === 'ru' 
          ? 'Неподдерживаемый формат. Используйте JPG, PNG, GIF, WebP или SVG' 
          : 'Unsupported format. Use JPG, PNG, GIF, WebP or SVG'
      );
      return;
    }

    if (file.size > maxFileSize) {
      toast.error(
        language === 'ru' 
          ? 'Файл слишком большой. Максимум 10MB' 
          : 'File too large. Maximum 10MB'
      );
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${lessonId}/${Date.now()}.${fileExt}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 100);

      const { data, error } = await supabase.storage
        .from('lesson-images')
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('lesson-images')
        .getPublicUrl(filePath);

      onUploadComplete(urlData.publicUrl);
      setPreviewUrl(urlData.publicUrl);

      toast.success(
        language === 'ru' ? 'Изображение загружено' : 'Image uploaded'
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      setPreviewUrl(null);
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

  const handleRemove = useCallback(() => {
    setStatus('idle');
    setUploadProgress(0);
    setFileName(null);
    setPreviewUrl(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUploadComplete]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
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
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">
            {language === 'ru' 
              ? 'Перетащите изображение или нажмите для выбора' 
              : 'Drag image or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, GIF, WebP, SVG • {language === 'ru' ? 'до' : 'up to'} 10MB
          </p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="space-y-3">
          {previewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full max-h-48 object-contain opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 w-3/4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'success' && previewUrl && (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Uploaded" 
            className="w-full max-h-48 object-contain rounded-lg border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={openFileDialog}
            >
              {language === 'ru' ? 'Заменить' : 'Replace'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
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
    </div>
  );
}
