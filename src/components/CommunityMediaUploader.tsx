import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ImageIcon, Video, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CommunityMediaUploaderProps {
  communityId: string;
  type: 'image' | 'video';
  onUploadComplete: (url: string) => void;
  className?: string;
  language: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function CommunityMediaUploader({
  communityId,
  type,
  onUploadComplete,
  className,
  language
}: CommunityMediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  
  const allowedTypes = type === 'image' ? imageTypes : videoTypes;
  const maxFileSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for videos

  const uploadFile = useCallback(async (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      const formats = type === 'image' 
        ? 'JPG, PNG, GIF, WebP, SVG' 
        : 'MP4, WebM, MOV';
      toast.error(
        language === 'ru' 
          ? `Неподдерживаемый формат. Используйте ${formats}` 
          : `Unsupported format. Use ${formats}`
      );
      return;
    }

    if (file.size > maxFileSize) {
      const limit = type === 'image' ? '10MB' : '50MB';
      toast.error(
        language === 'ru' 
          ? `Файл слишком большой. Максимум ${limit}` 
          : `File too large. Maximum ${limit}`
      );
      return;
    }

    // Create preview for images
    if (type === 'image') {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
    
    setFileName(file.name);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${communityId}/${type}s/${Date.now()}.${fileExt}`;

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

      const { error } = await supabase.storage
        .from('community-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (error) throw error;

      setUploadProgress(100);
      setStatus('success');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('community-content')
        .getPublicUrl(filePath);

      onUploadComplete(urlData.publicUrl);
      setPreviewUrl(urlData.publicUrl);

      toast.success(
        language === 'ru' 
          ? (type === 'image' ? 'Изображение загружено' : 'Видео загружено')
          : (type === 'image' ? 'Image uploaded' : 'Video uploaded')
      );
      
      // Reset to allow another upload
      setTimeout(() => {
        setStatus('idle');
        setPreviewUrl(null);
        setFileName(null);
      }, 1000);
      
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
  }, [communityId, type, language, onUploadComplete, allowedTypes, maxFileSize]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    setPreviewUrl(null);
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const Icon = type === 'image' ? ImageIcon : Video;
  const acceptTypes = type === 'image' 
    ? 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'
    : 'video/mp4,video/webm,video/quicktime';
  const formatText = type === 'image' 
    ? 'JPG, PNG, GIF, WebP, SVG • 10MB'
    : 'MP4, WebM, MOV • 50MB';

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === 'idle' && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
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
          <Icon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {language === 'ru' 
              ? `Перетащите ${type === 'image' ? 'изображение' : 'видео'} или нажмите` 
              : `Drag ${type} or click to select`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatText}
          </p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'ru' ? 'Загрузка...' : 'Uploading...'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      {status === 'error' && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm flex-1">
              {language === 'ru' ? 'Ошибка загрузки' : 'Upload failed'}
            </p>
            <Button variant="outline" size="sm" onClick={openFileDialog}>
              {language === 'ru' ? 'Повторить' : 'Retry'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}