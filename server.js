const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mime = require('mime');
const cors = require('cors');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(__dirname, 'metadata.json');
const PORT = process.env.PORT || 3000;
const FILE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

let metadata = {};
try {
  metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8') || '{}');
} catch (e) {
  metadata = {};
}

function saveMetadata() {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, id + ext);
  }
});

const upload = multer({ storage });
const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const filename = req.file.filename;
  const id = path.parse(filename).name;
  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const size = req.file.size;

  metadata[id] = {
    filename,
    originalName,
    mimeType,
    size,
    createdAt: Date.now(),
    expiresAt: Date.now() + FILE_TTL_MS
  };
  saveMetadata();

  const link = `${req.protocol}://${req.get('host')}/download/${id}`;
  res.json({ id, link });
});

function streamFile(req, res, filePath, mimeType) {
  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(res);
  }
}

app.get('/download/:id', (req, res) => {
  const id = req.params.id;
  const entry = metadata[id];
  if (!entry) return res.status(404).send('Ficheiro não encontrado ou expirado');

  const filePath = path.join(UPLOAD_DIR, entry.filename);
  if (!fs.existsSync(filePath)) {
    delete metadata[id];
    saveMetadata();
    return res.status(404).send('Ficheiro não encontrado');
  }

  const now = Date.now();
  if (entry.expiresAt && now > entry.expiresAt) {
    try { fs.unlinkSync(filePath); } catch (e) {}
    delete metadata[id];
    saveMetadata();
    return res.status(410).send('Ficheiro expirado');
  }

  const mimeType = entry.mimeType || mime.getType(filePath) || 'application/octet-stream';
  const inlineTypes = ['video/', 'audio/', 'image/'];
  if (inlineTypes.some(t => mimeType.startsWith(t))) {
    streamFile(req, res, filePath, mimeType);
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${entry.originalName}"`);
    streamFile(req, res, filePath, mimeType);
  }
});

setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(metadata)) {
    const entry = metadata[id];
    const filePath = path.join(UPLOAD_DIR, entry.filename);
    if (entry.expiresAt && now > entry.expiresAt) {
      try { fs.unlinkSync(filePath); } catch (e) {}
      delete metadata[id];
      changed = true;
    } else if (!fs.existsSync(filePath)) {
      delete metadata[id];
      changed = true;
    }
  }
  if (changed) saveMetadata();
}, 10 * 60 * 1000);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
