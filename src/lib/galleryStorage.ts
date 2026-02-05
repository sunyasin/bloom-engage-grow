// Константы для Gallery Storage в Supabase
export const GALLERY_BUCKET = 'gallery-public';
export const GALLERY_THUMBNAILS_FOLDER = 'gallery/thumbnails';
export const GALLERY_PHOTOS_FOLDER = 'gallery/photos';
export const GALLERY_AUDIO_FOLDER = 'audio';

// Генерация уникального имени файла для галереи
export function generateGalleryFileName(
  originalName: string,
  folder: string = ''
): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const baseName = originalName.replace(/\.[^.]+$/, '');
  const transliteratedName = transliterate(baseName);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const folderPath = folder ? `${folder}/` : '';
  return `${folderPath}${transliteratedName}-${timestamp}-${random}.${ext}`;
}

// Транслитерация названия файла
function transliterate(text: string): string {
  const mapping: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e',
    ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
    ь: '', ы: 'y', ъ: '', э: 'e', ю: 'yu', я: 'ya',
    ' ': '_', '-': '_', '.': '_', ',': '_', '(': '_', ')': '_'
  };
  
  return text.split('').map(char => mapping[char] || char).join('')
    .replace(/[^a-z0-9_]/gi, '_')
    .toLowerCase();
}
