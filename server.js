const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());

// 讓 server 也能直接讀取你的網頁檔 (給手機看的)
app.use(express.static(__dirname)); 
app.use('/uploads', express.static('uploads'));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + '.webm'); // 統一存成 webm
    }
});
const upload = multer({ storage });

// 1. 接收雙手影片 (保留原本)
app.post('/upload', upload.array('videos', 2), (req, res) => {
    res.json({ success: true, vid1: req.files[0].filename, vid2: req.files[1].filename });
});

// 🚀 2. 拍貼機專用：只存檔，【不轉檔】，瞬間完成！
app.post('/upload-final', upload.single('finalVideo'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    console.log("📥 拍貼機已存檔：", req.file.filename);
    res.json({ success: true, filename: req.file.filename });
});

// 🚀 3. 手機專用：按鈕點擊後才呼叫這支 API 來轉檔
app.get('/convert-to-mp4', (req, res) => {
    const filename = req.query.file;
    if (!filename) return res.status(400).send('找不到檔案');

    const inputPath = path.join(__dirname, 'uploads', filename);
    const outputPath = path.join(__dirname, 'uploads', filename.replace('.webm', '.mp4'));

    // 如果已經轉過了，就直接給檔案，不用重轉
    if (fs.existsSync(outputPath)) {
        return res.json({ success: true, videoUrl: `/uploads/${path.basename(outputPath)}` });
    }

    console.log(`📱 手機觸發轉檔：${filename} ...請稍候`);

    ffmpeg(inputPath)
        .outputOptions([
            '-c:v libx264',
            '-preset ultrafast', // 極速模式，保護電腦不當機
            '-threads 2',        // 限制只用雙核心運算
            '-pix_fmt yuv420p',
            '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
        ])
        .save(outputPath)
        .on('end', () => {
            console.log("✅ 手機轉檔任務完成！");
            res.json({ success: true, videoUrl: `/uploads/${path.basename(outputPath)}` });
        })
        .on('error', (err) => {
            console.error("❌ 轉檔失敗：", err);
            res.status(500).json({ success: false });
        });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('🚀 展場伺服器啟動中！Port: 3000');
});