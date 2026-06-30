const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// Default to New_music/ at repo root; override with UPLOAD_FOLDER env var
const UPLOAD_DIR = process.env.UPLOAD_FOLDER
  || path.join(__dirname, "..", "..", "..", "New_music");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const dest = path.join(UPLOAD_DIR, file.originalname);
    if (fs.existsSync(dest)) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${base}_${Date.now()}${ext}`);
    } else {
      cb(null, file.originalname);
    }
  },
});

function mp3Only(_req, file, cb) {
  const ok = file.mimetype === "audio/mpeg"
    || path.extname(file.originalname).toLowerCase() === ".mp3";
  cb(ok ? null : new Error("Seuls les fichiers .mp3 sont acceptés"), ok);
}

const upload = multer({ storage, fileFilter: mp3Only });

router.post("/", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    res.json({
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
    });
  });
});

module.exports = router;
