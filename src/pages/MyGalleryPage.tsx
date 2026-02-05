import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileText, Image as ImageIcon, Upload, ChevronRight, Edit2 } from 'lucide-react';
import { CreateCollectionDialog } from '@/components/gallery/CreateCollectionDialog';
import { CreatePostDialog } from '@/components/gallery/CreatePostDialog';
import { AddPhotosDialog } from '@/components/gallery/AddPhotosDialog';
import { EditCollectionDialog } from '@/components/gallery/EditCollectionDialog';
import { GALLERY_BUCKET } from '@/lib/galleryStorage';

interface GalleryCollection {
  id: number;
  name: string;
  year: number;
  thumbnail_url: string | null;
  community_id: string | null;
  created_at: string;
}

interface GalleryPhoto {
  id: number;
  url: string;
  description: string | null;
}

interface GalleryPost {
  id: number;
  title: string | null;
  thumbnail_url: string | null;
}

interface Community {
  id: string;
  name: string;
}

export default function MyGalleryPage({ user }: { user: User | null }) {
  const navigate = useNavigate();
  
  const [collections, setCollections] = useState<GalleryCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<GalleryCollection | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [editCollectionOpen, setEditCollectionOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [addPhotosOpen, setAddPhotosOpen] = useState(false);
  
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadCollections();
      loadCommunities();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCollection) {
      loadCollectionItems(selectedCollection.id);
    }
  }, [selectedCollection]);

  const loadCommunities = async () => {
    // Загружаем только gallery сообщества, на которые подписан пользователь
    const { data } = await supabase
      .from('community_members')
      .select(`
        communities!inner(id, name, type)
      `)
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .eq('communities.type', 'gallery');
    
    if (data) {
      const galleryCommunities = data
        .map(d => d.communities as { id: string; name: string })
        .filter(c => c && c.id && c.name);
      setCommunities(galleryCommunities);
    } else {
      setCommunities([]);
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gallery_collections')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setCollections(data);
      if (data.length > 0 && !selectedCollection) {
        setSelectedCollection(data[0]);
      }
    }
    setLoading(false);
  };

  const loadCollectionItems = async (collectionId: number) => {
    const [photosResult, postsResult] = await Promise.all([
      supabase
        .from('gallery_photos')
        .select('id, url, description')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('gallery_posts')
        .select('id, title, thumbnail_url')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: false })
    ]);

    setPhotos(photosResult.data || []);
    setPosts(postsResult.data || []);
  };

  const handleCollectionSelect = (collection: GalleryCollection) => {
    setSelectedCollection(collection);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;

    if (!selectedCollection || !user) return;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    await uploadPhotos(files);
  }, [selectedCollection, user]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await uploadPhotos(files);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPhotos = async (files: File[]) => {
    if (!selectedCollection || !user) return;

    setLoading(true);
    
    try {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `gallery/${selectedCollection.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from(GALLERY_BUCKET)
          .getPublicUrl(filePath);
        
        const { error: dbError } = await supabase
          .from('gallery_photos')
          .insert({
            url: publicUrl,
            collection_id: selectedCollection.id,
            user_id: user.id
          });
        
        if (dbError) throw dbError;
      }
      
      await loadCollectionItems(selectedCollection.id);
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Мой фото-блог</h1>
        <p className="text-muted-foreground">Пожалуйста, войдите в систему</p>
      </div>
    );
  }

  if (loading && collections.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Мой фото-блог</h1>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Collections List */}
        <div className="w-64 flex-shrink-0">
          <div className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-muted font-medium border-b flex items-center justify-between">
              <span>Мои сборники</span>
              <Button variant="ghost" size="icon" onClick={() => setCreateCollectionOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  className={`w-full p-3 text-left border-b last:border-b-0 hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                    selectedCollection?.id === collection.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleCollectionSelect(collection)}
                >
                  {collection.thumbnail_url ? (
                    <img
                      src={collection.thumbnail_url}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{collection.name}</p>
                    <p className="text-sm text-muted-foreground">{collection.year}</p>
                  </div>
                  {selectedCollection?.id === collection.id && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
              
              {collections.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  Нет сборников
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {selectedCollection ? (
            <>
              {/* Collection Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selectedCollection.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {photos.length} фото • {posts.length} постов
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditCollectionOpen(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Сборник
                  </Button>
                  <Button variant="outline" onClick={() => setCreatePostOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Добавить пост
                  </Button>
                  <Button onClick={() => setAddPhotosOpen(true)}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Добавить фото
                  </Button>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragCounter.current > 0 ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Перетащите фото сюда</p>
                <p className="text-sm text-muted-foreground mt-1">
                  или нажмите для выбора файлов
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Items Grid */}
              <div className="mt-6">
                {/* Posts */}
                {posts.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">Посты</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className="aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/gallery/${selectedCollection.id}`, { state: { returnTo: '/my-gallery' } })}
                        >
                          {post.thumbnail_url ? (
                            <img
                              src={post.thumbnail_url}
                              alt={post.title || ''}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="font-medium text-sm truncate">
                              {post.title || 'Без названия'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {photos.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Фотографии</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group hover:opacity-80 transition-opacity relative"
                          onClick={() => navigate(`/gallery/${selectedCollection.id}`, { state: { returnTo: '/my-gallery' } })}
                        >
                          <img
                            src={photo.url}
                            alt={photo.description || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {photos.length === 0 && posts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>В этом сборнике пока нет фото или постов</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-4">
                Создайте свой первый сборник
              </p>
              <Button onClick={() => setCreateCollectionOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать сборник
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateCollectionDialog
        open={createCollectionOpen}
        onOpenChange={setCreateCollectionOpen}
        communities={communities}
        userId={user.id}
        onCollectionCreated={loadCollections}
      />

      {selectedCollection && (
        <>
          <CreatePostDialog
            open={createPostOpen}
            onOpenChange={setCreatePostOpen}
            collectionId={selectedCollection.id}
            userId={user.id}
            onPostCreated={() => loadCollectionItems(selectedCollection.id)}
          />

          <AddPhotosDialog
            open={addPhotosOpen}
            onOpenChange={setAddPhotosOpen}
            collectionId={selectedCollection.id}
            userId={user.id}
            onPhotosAdded={() => loadCollectionItems(selectedCollection.id)}
          />

          <EditCollectionDialog
            open={editCollectionOpen}
            onOpenChange={setEditCollectionOpen}
            communities={communities}
            collection={selectedCollection}
            onCollectionUpdated={() => {
              loadCollections();
              // После обновления находим текущий selectedCollection в массиве
              if (selectedCollection) {
                loadCollectionItems(selectedCollection.id);
                // Обновляем selectedCollection из свежего массива
                setCollections(prev => {
                  const updated = prev.find(c => c.id === selectedCollection.id);
                  if (updated) {
                    setSelectedCollection(updated);
                  }
                  return prev;
                });
              }
            }}
          />
        </>
      )}
    </div>
  );
}
