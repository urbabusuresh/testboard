// routes/files.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const router = express.Router();

// configure where files live on disk
const BASE_DIRS = [
  path.resolve(process.env.FILES_BASE_DIR || path.join(process.cwd(), 'uploads')),
  // add more roots if needed
];

// helper: resolve a safe absolute path under an allowed base dir
function resolveSafeFilePath(relativePath) {
  // decode URI components and normalize
  const decoded = decodeURIComponent(relativePath || '');
  const safeRel = decoded.replace(/^\/+/, ''); // remove leading slashes
  const absoluteCandidates = BASE_DIRS.map((base) => path.resolve(base, safeRel));

  // choose first candidate that starts with its base (prevents ../ traversal)
  for (let i = 0; i < BASE_DIRS.length; i++) {
    const base = BASE_DIRS[i];
    const abs = absoluteCandidates[i];
    if (abs.startsWith(base + path.sep) || abs === base) return abs;
  }
  return null;
}

/**
 * GET /files/*  -> streams file inline (supports range)
 * Example: /files/docs/guide.pdf
 */
router.get('/*', (req, res) => {
  const relPath = req.params[0];           // the catch-all part after /files/
  const absPath = resolveSafeFilePath(relPath);
  if (!absPath) return res.status(400).send('Invalid file path');

  fs.stat(absPath, (err, stat) => {
    if (err || !stat.isFile()) return res.status(404).send('File not found');

    const mimeType = mime.lookup(absPath) || 'application/octet-stream';
    const fileSize = stat.size;

    // Support Range requests (for video/audio/large files)
    const range = req.headers.range;
    if (range) {
      // Example: "bytes=0-"
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

      if (isNaN(start) || isNaN(end) || start > end || end >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end(); // Requested Range Not Satisfiable
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mimeType,
        // show inline in browser tab if supported (PDF/image/video/audio)
        'Content-Disposition': `inline; filename="${path.basename(absPath)}"`,
        'Cache-Control': 'public, max-age=3600',
      });

      const stream = fs.createReadStream(absPath, { start, end });
      stream.pipe(res);
      stream.on('error', () => res.end());
    } else {
      // No range -> stream whole file
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': fileSize,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${path.basename(absPath)}"`,
        'Cache-Control': 'public, max-age=3600',
      });
      const stream = fs.createReadStream(absPath);
      stream.pipe(res);
      stream.on('error', () => res.end());
    }
  });
});

module.exports = router;
