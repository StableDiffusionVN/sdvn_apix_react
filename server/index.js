import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const STORAGE_ROOT = __dirname;
const CATEGORY_PATHS = {
    gallery: path.join(STORAGE_ROOT, 'gallery'),
    history: path.join(STORAGE_ROOT, 'history'),
};
const DATA_PATH = path.join(STORAGE_ROOT, 'data');
const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_PATHS));
const LEGACY_STORAGE_ROOT = path.join(STORAGE_ROOT, 'uploads');
const LEGACY_CATEGORY_PATHS = {
    gallery: path.join(LEGACY_STORAGE_ROOT, 'gallery'),
    history: path.join(LEGACY_STORAGE_ROOT, 'history'),
};

const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

const sanitizeSubfolder = (value) => {
    if (!value) return '';
    const cleaned = value.toString().replace(/[^a-zA-Z0-9-_]/g, '');
    return cleaned || '';
};

const isValidPathSegment = (value) => {
    return /^[a-zA-Z0-9-_.]+$/.test(value);
};

const getCategoryDirectory = (category) => {
    return typeof category === 'string' && ALLOWED_CATEGORIES.has(category)
        ? CATEGORY_PATHS[category]
        : null;
};

const buildSafeFilePath = (categoryDir, segments) => {
    const safeSegments = segments.filter(Boolean);
    if (safeSegments.length === 0) return null;

    for (const segment of safeSegments) {
        if (!isValidPathSegment(segment)) {
            return null;
        }
    }

    const relativePath = path.join(...safeSegments);
    const resolvedPath = path.resolve(categoryDir, relativePath);

    if (!resolvedPath.startsWith(categoryDir)) {
        return null;
    }

    return resolvedPath;
};

const generateUniqueFilePath = (filePath) => {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    let counter = 1;
    let candidate = filePath;

    while (fs.existsSync(candidate)) {
        candidate = path.join(dir, `${base}-${counter}${ext}`);
        counter += 1;
    }

    return candidate;
};

const moveLegacyEntry = (srcPath, destPath) => {
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
        ensureDirectoryExists(destPath);
        fs.readdirSync(srcPath).forEach(entry => {
            moveLegacyEntry(path.join(srcPath, entry), path.join(destPath, entry));
        });
        fs.rmdirSync(srcPath);
    } else {
        let targetPath = destPath;
        if (fs.existsSync(targetPath)) {
            targetPath = generateUniqueFilePath(targetPath);
        }
        ensureDirectoryExists(path.dirname(targetPath));
        fs.renameSync(srcPath, targetPath);
    }
};

const moveLegacyCategory = (category) => {
    const legacyDir = LEGACY_CATEGORY_PATHS[category];
    if (!fs.existsSync(legacyDir)) {
        return;
    }

    ensureDirectoryExists(CATEGORY_PATHS[category]);
    fs.readdirSync(legacyDir).forEach(entry => {
        moveLegacyEntry(path.join(legacyDir, entry), path.join(CATEGORY_PATHS[category], entry));
    });

    fs.rmSync(legacyDir, { recursive: true, force: true });
};

const migrateLegacyStorage = () => {
    if (!fs.existsSync(LEGACY_STORAGE_ROOT)) {
        return;
    }

    Object.keys(LEGACY_CATEGORY_PATHS).forEach(moveLegacyCategory);

    if (fs.existsSync(LEGACY_STORAGE_ROOT)) {
        const remaining = fs.readdirSync(LEGACY_STORAGE_ROOT);
        if (remaining.length === 0) {
            fs.rmSync(LEGACY_STORAGE_ROOT, { recursive: true, force: true });
        }
    }
    console.info('✅ Legacy uploads (if any) have been migrated to the new storage layout.');
};

const parseFileUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return null;
    }

    let pathname = url;
    try {
        pathname = new URL(url).pathname;
    } catch {
        pathname = url.startsWith('/') ? url : `/${url}`;
    }

    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
        return null;
    }

    const [category, ...rest] = parts;
    const categoryDir = getCategoryDirectory(category);
    if (!categoryDir) {
        return null;
    }

    const filePath = buildSafeFilePath(categoryDir, rest);
    if (!filePath) {
        return null;
    }

    return { category, filePath, categoryDir };
};

Object.values(CATEGORY_PATHS).forEach(dir => ensureDirectoryExists(dir));
ensureDirectoryExists(DATA_PATH);
const GALLERY_SUBFOLDERS = ['upload', 'outputs', 'image_editor', 'extra'];
GALLERY_SUBFOLDERS.forEach(sub => ensureDirectoryExists(path.join(CATEGORY_PATHS.gallery, sub)));
ensureDirectoryExists(path.join(CATEGORY_PATHS.history, 'upload'));
migrateLegacyStorage();

const INTERNAL_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (INTERNAL_ALLOWED_ORIGINS.includes(origin)) return true;
    if (/^http:\/\/127\.\d+\.\d+\.\d+:3000$/.test(origin)) return true;
    if (/^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin)) return true;
    if (/^http:\/\/172\.16\.\d+\.\d+:3000$/.test(origin)) return true;
    if (/^http:\/\/10\.\d+\.\d+\.\d+:3000$/.test(origin)) return true;
    return false;
};

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve files statically from new structure
app.use('/gallery', express.static(CATEGORY_PATHS.gallery));
app.use('/history', express.static(CATEGORY_PATHS.history));
app.use('/data', express.static(DATA_PATH));

// Configure multer for file uploads
// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.params.category;
        const categoryDir = getCategoryDirectory(category);

        if (!categoryDir) {
            return cb(new Error('Invalid category'));
        }

        const subfolder = sanitizeSubfolder(req.query?.subfolder);
        let uploadPath = categoryDir;

        if (subfolder) {
            uploadPath = path.join(uploadPath, subfolder);
        }

        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.png';
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'aPix backend server is running' });
});

// Upload single or multiple images
app.post('/api/upload/:category', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const category = req.params.category;
        const categoryDir = getCategoryDirectory(category);

        if (!categoryDir) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const subfolder = sanitizeSubfolder(req.query?.subfolder);
        
        const fileUrls = req.files.map(file => {
            const pathPart = subfolder ? `${category}/${subfolder}` : category;
            return `http://localhost:${PORT}/${pathPart}/${file.filename}`;
        });

        res.json({
            success: true,
            urls: fileUrls,
            count: fileUrls.length
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload base64 image
app.post('/api/upload-base64/:category', async (req, res) => {
    try {
        const { base64, filename } = req.body;
        const category = req.params.category;
        const categoryDir = getCategoryDirectory(category);

        if (!categoryDir) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const subfolder = sanitizeSubfolder(req.query?.subfolder);

        if (!base64) {
            return res.status(400).json({ error: 'No base64 data provided' });
        }

        // Extract base64 data and mime type
        const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid base64 format' });
        }

        const ext = matches[1];
        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Generate filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const finalFilename = filename || `img-${uniqueSuffix}.${ext}`;

        // Ensure directory exists
        let uploadPath = categoryDir;
        if (subfolder) {
            uploadPath = path.join(uploadPath, subfolder);
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        // Write file
        const filePath = path.join(uploadPath, finalFilename);
        fs.writeFileSync(filePath, buffer);

        const pathPart = subfolder ? `${category}/${subfolder}` : category;
        const fileUrl = `http://localhost:${PORT}/${pathPart}/${finalFilename}`;

        res.json({
            success: true,
            url: fileUrl,
            filename: finalFilename
        });
    } catch (error) {
        console.error('Base64 upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get image
app.get('/api/images/:category/:filename', (req, res) => {
    const { category, filename } = req.params;
    const categoryDir = getCategoryDirectory(category);

    if (!categoryDir) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const filePath = buildSafeFilePath(categoryDir, [filename]);
    if (!filePath) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Image not found' });
    }
});

// Get image from subfolder
app.get('/api/images/:category/:subfolder/:filename', (req, res) => {
    const { category, subfolder, filename } = req.params;
    const categoryDir = getCategoryDirectory(category);

    if (!categoryDir) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    const safeSubfolder = sanitizeSubfolder(subfolder);
    if (!safeSubfolder) {
        return res.status(400).json({ error: 'Invalid subfolder' });
    }

    const filePath = buildSafeFilePath(categoryDir, [safeSubfolder, filename]);

    if (filePath && fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Image not found' });
    }
});

// Helper to recursively get files
const getFilesRecursively = (dir, fileList = [], relativePath = '') => {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getFilesRecursively(filePath, fileList, path.join(relativePath, file));
        } else {
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
                fileList.push({
                    filename: file,
                    relativePath: path.join(relativePath, file),
                    fullPath: filePath
                });
            }
        }
    });
    return fileList;
};

// List images in category (recursive)
app.get('/api/images/:category', (req, res) => {
    try {
        const category = req.params.category;
        const categoryDir = getCategoryDirectory(category);

        if (!categoryDir) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        if (!fs.existsSync(categoryDir)) {
            return res.json({ images: [] });
        }

        const allFiles = getFilesRecursively(categoryDir);
        
        const images = allFiles.map(file => {
            // Convert backslashes to forward slashes for URLs if on Windows, though we are on Mac
            const urlPath = file.relativePath.split(path.sep).join('/');
            const stats = fs.statSync(file.fullPath);
            return {
                filename: file.filename,
                url: `http://localhost:${PORT}/${category}/${urlPath}`,
                path: file.fullPath,
                subfolder: path.dirname(file.relativePath) === '.' ? '' : path.dirname(file.relativePath),
                mtime: stats.mtime.getTime()
            };
        });

        // Sort by modification time (newest first)
        images.sort((a, b) => {
            return fs.statSync(b.path).mtime.getTime() - fs.statSync(a.path).mtime.getTime();
        });

        res.json({ images, count: images.length });
    } catch (error) {
        console.error('List images error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete image
app.delete('/api/images/:category/:filename', (req, res) => {
    try {
        const { category, filename } = req.params;
        const categoryDir = getCategoryDirectory(category);

        if (!categoryDir) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const filePath = buildSafeFilePath(categoryDir, [filename]);
        if (!filePath) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete image by URL
app.post('/api/delete-by-url', (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'No URL provided' });
        }

        const parsed = parseFileUrl(url);

        if (!parsed) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const { filePath } = parsed;

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Delete by URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- JSON Data Endpoints ---

// Save JSON data
app.post('/api/data/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const data = req.body;
        
        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Sanitize filename
        const safeFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '');
        const dataPath = DATA_PATH;
        ensureDirectoryExists(dataPath);

        const filePath = path.join(dataPath, safeFilename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Save data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Load JSON data
app.get('/api/data/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const safeFilename = filename.replace(/[^a-zA-Z0-9-_\.]/g, '');
        const dataPath = DATA_PATH;
        const filePath = path.join(dataPath, safeFilename);

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.status(404).json({ error: 'Data file not found' });
        }
    } catch (error) {
        console.error('Load data error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`✅ aPix Backend Server running on http://localhost:${PORT}`);
    console.log(`📁 Gallery directory: ${CATEGORY_PATHS.gallery}`);
    console.log(`📁 History directory: ${CATEGORY_PATHS.history}`);
    console.log(`📁 Data directory: ${DATA_PATH}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or change PORT before restarting.`);
        process.exit(1);
    }

    console.error('Unexpected server error:', err);
    process.exit(1);
});
