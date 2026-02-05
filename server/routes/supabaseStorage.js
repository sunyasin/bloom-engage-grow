import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const BUCKET_NAME = 'gallery';

// Настройка multer для временного хранения
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'temp');
    cb(null, tempPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `temp-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: tempStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Транслитерация названия файла
function transliterate(text) {
  const mapping = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '_', '-': '_', '.': '_', ',': '_', '(': '_', ')': '_'
  };
  return text.split('').map(char => mapping[char] || char).join('')
    .replace(/[^a-z0-9_]/gi, '_')
    .toLowerCase();
}

// Генерация уникального имени файла
function generateFileName(originalName, folder = '') {
  const ext = path.extname(originalName) || '.jpg';
  const baseName = path.basename(originalName, ext);
  const transliteratedName = transliterate(baseName);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const folderPath = folder ? `${folder}/` : '';
  return `${folderPath}${transliteratedName}-${timestamp}-${random}${ext}`;
}

// Upload single file to Supabase Storage
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!supabaseAdmin) {
      console.error('[SupabaseStorage] Admin client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ error: 'Supabase admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY in .env' });
    }

    const folder = req.body.folder || '';
    const fileName = generateFileName(req.file.originalname, folder);

    console.log('[SupabaseStorage] Uploading file:', fileName, 'to bucket:', BUCKET_NAME);

    // Читаем файл и загружаем в Supabase
    const fs = await import('fs');
    const fileBuffer = await fs.promises.readFile(req.file.path);

    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('[SupabaseStorage] Upload error:', error);
      // Удаляем временный файл
      await fs.promises.unlink(req.file.path);
      return res.status(500).json({ error: `Supabase upload failed: ${error.message}` });
    }

    // Получаем публичный URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    // Удаляем временный файл
    await fs.promises.unlink(req.file.path);

    console.log('[SupabaseStorage] Upload success:', urlData.publicUrl);

    res.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileName: fileName
    });
  } catch (error) {
    console.error('[SupabaseStorage] Upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Upload multiple files to Supabase Storage
router.post('/upload-multiple', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!supabaseAdmin) {
      console.error('[SupabaseStorage] Admin client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ error: 'Supabase admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY in .env' });
    }

    const folder = req.body.folder || '';
    const uploadedFiles = [];
    const fs = await import('fs');

    console.log('[SupabaseStorage] Uploading', req.files.length, 'files to bucket:', BUCKET_NAME);

    for (const file of req.files) {
      const fileName = generateFileName(file.originalname, folder);
      
      const fileBuffer = await fs.promises.readFile(file.path);

      const { data, error } = await supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('[SupabaseStorage] Upload error:', error);
        throw new Error(error.message);
      }

      const { data: urlData } = supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      uploadedFiles.push({
        url: urlData.publicUrl,
        path: data.path,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });

      // Удаляем временный файл
      await fs.promises.unlink(file.path);
    }

    console.log('[SupabaseStorage] Upload success:', uploadedFiles.length, 'files');

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('[SupabaseStorage] Upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

export default router;
