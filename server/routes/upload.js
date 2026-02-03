import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка хранилища - сохраняем во временную папку
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempPath = path.join(__dirname, '..', '..', 'public', 'uploads', 'temp');
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true, mode: 0o755 });
    }
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
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Функция для перемещения файла в целевую папку
function moveFileToFolder(sourcePath, targetFolder, originalName) {
  // Используем оригинальное имя файла если передано
  if (originalName) {
    const ext = path.extname(originalName) || '.jpg';
    const baseName = path.basename(originalName, ext);
    // Транслитерируем и добавляем timestamp для уникальности
    const transliteratedName = baseName
      .replace(/[^а-яёa-z0-9]/gi, '_')
      .toLowerCase();
    const fileName = `${transliteratedName}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    
    const uploadsRoot = path.join(__dirname, '..', '..', 'public', 'uploads');
    const folderParts = targetFolder.split('/').filter(Boolean);
    const targetPath = path.join(uploadsRoot, ...folderParts);
    
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true, mode: 0o755 });
    }
    
    const finalPath = path.join(targetPath, fileName);
    fs.renameSync(sourcePath, finalPath);
    
    return fileName;
  }
  
  // Fallback: генерируем имя если originalName не передан
  const ext = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, ext);
  const transliteratedName = baseName
    .replace(/[^а-яёa-z0-9]/gi, '_')
    .toLowerCase()
    .replace(/temp-/gi, '');
  
  const newFileName = `${transliteratedName}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
  
  const uploadsRoot = path.join(__dirname, '..', '..', 'public', 'uploads');
  const folderParts = targetFolder.split('/').filter(Boolean);
  const targetPath = path.join(uploadsRoot, ...folderParts);
  
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true, mode: 0o755 });
  }
  
  const finalPath = path.join(targetPath, newFileName);
  fs.renameSync(sourcePath, finalPath);
  
  return newFileName;
}

// Upload endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'gallery';
    
    // Перемещаем файл в целевую папку, используя оригинальное имя
    const fileName = moveFileToFolder(req.file.path, folder, req.file.originalname);
    
    // URL для доступа к файлу
    const fileUrl = `/uploads/${folder}/${fileName}`;

    res.json({
      success: true,
      url: fileUrl,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Multiple files upload endpoint
router.post('/upload-multiple', upload.array('files', 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const folder = req.body.folder || 'gallery';
    
    const uploadedFiles = req.files.map((file) => {
      // Перемещаем файл в целевую папку, используя оригинальное имя
      const fileName = moveFileToFolder(file.path, folder, file.originalname);
      const fileUrl = `/uploads/${folder}/${fileName}`;
      
      return {
        url: fileUrl,
        fileName: fileName,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      };
    });

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
