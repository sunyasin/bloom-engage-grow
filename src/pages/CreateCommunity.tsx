import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Upload, X } from 'lucide-react';

export default function CreateCommunity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    cover_image_url: '',
    type: 'course',
  });

  const communityTypes = [
    {
      value: 'course',
      label: language === 'ru' ? 'Курс' : 'Course',
      description: language === 'ru' 
        ? 'Для создания курсов, обучения, консультации' 
        : 'For creating courses, education, consultations',
    },
    {
      value: 'shop',
      label: language === 'ru' ? 'Магазин' : 'Shop',
      description: language === 'ru' 
        ? 'Для одного или нескольких магазинов с товарами/услугами' 
        : 'For one or multiple shops with goods/services',
    },
    {
      value: 'gallery',
      label: language === 'ru' ? 'Галерея' : 'Gallery',
      description: language === 'ru' 
        ? 'Для создания клуба по интересам с персональными фото-галереями участников или авторскими блогами и общим тематическим форумом' 
        : 'For creating an interest club with personal photo galleries of participants or author blogs and a general thematic forum',
    },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('portal_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.portal_subscription_id) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Необходимо выбрать подписку' : 'Please select a subscription first',
        variant: 'destructive',
      });
      navigate('/my-communities');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Выберите изображение' : 'Please select an image',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('community-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, cover_image_url: urlData.publicUrl });

      toast({
        title: language === 'ru' ? 'Успех' : 'Success',
        description: language === 'ru' ? 'Изображение загружено' : 'Image uploaded',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, cover_image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Необходимо авторизоваться' : 'Authentication required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name || !formData.slug) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ru' ? 'Заполните обязательные поля' : 'Please fill in required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: existingCommunity } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', formData.slug)
        .maybeSingle();

      if (existingCommunity) {
        toast({
          title: language === 'ru' ? 'Ошибка' : 'Error',
          description: language === 'ru' ? 'Сообщество с таким URL уже существует' : 'Community with this URL already exists',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data: community, error } = await supabase
        .from('communities')
        .insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          cover_image_url: formData.cover_image_url || null,
          type: formData.type,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('community_members')
        .insert({
          user_id: user.id,
          community_id: community.id,
          role: 'owner',
          is_active: true,
        });

      toast({
        title: language === 'ru' ? 'Успех' : 'Success',
        description: language === 'ru' ? 'Сообщество успешно создано' : 'Community created successfully',
      });

      navigate(`/community/${community.id}`);
    } catch (error: any) {
      console.error('Error creating community:', error);
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {language === 'ru' ? 'Создать сообщество' : 'Create Community'}
          </CardTitle>
          <CardDescription>
            {language === 'ru'
              ? 'Заполните информацию о вашем новом сообществе'
              : 'Fill in the information about your new community'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>
                {language === 'ru' ? 'Тип сообщества' : 'Community Type'} <span className="text-destructive">*</span>
              </Label>
              <RadioGroup 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                className="grid grid-cols-1 gap-4"
              >
                {communityTypes.map((type) => (
                  <div 
                    key={type.value} 
                    className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-input hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({ ...formData, type: type.value })}
                  >
                    <RadioGroupItem value={type.value} className="mt-1" />
                    <div className="flex-1">
                      <Label className="text-base font-medium cursor-pointer">
                        {type.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                {language === 'ru' ? 'Название' : 'Name'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={language === 'ru' ? 'Название вашего сообщества' : 'Your community name'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="community-url"
                required
              />
              <p className="text-sm text-muted-foreground">
                {language === 'ru'
                  ? 'Адрес вашего сообщества: '
                  : 'Your community URL: '}
                <span className="font-mono">/community/{formData.slug || 'your-url'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {language === 'ru' ? 'Описание' : 'Description'}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  language === 'ru'
                    ? 'Расскажите о вашем сообществе...'
                    : 'Tell us about your community...'
                }
                rows={4}
              />
            </div>

<div className="space-y-2">
              <Label>
                {language === 'ru' ? 'Обложка' : 'Cover Image'}
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {!formData.cover_image_url ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'ru' ? 'Загрузка...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {language === 'ru' ? 'Загрузить изображение' : 'Upload image'}
                    </>
                  )}
                </Button>
              ) : (
                <div className="relative">
                  <img
                    src={formData.cover_image_url}
                    alt="Cover"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/my-communities')}
              disabled={loading}
              className="flex-1"
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'ru' ? 'Создание...' : 'Creating...'}
                </>
              ) : (
                language === 'ru' ? 'Создать' : 'Create'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
