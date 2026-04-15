require('dotenv').config(); // Bước 1: Nạp biến môi trường từ .env
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Bước 2: Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Bước 3: Định nghĩa cấu trúc bài văn (Schema)
const essaySchema = new mongoose.Schema({
    studentName: String,
    studentID: String, // Ví dụ: DTH235820
    class: String,      // Ví dụ: DH24TH3
    title: String,      // Tên bài văn
    driveFileId: String, // ID file trên Google Drive sau khi upload
    uploadDate: { type: Date, default: Date.now }
});

const Essay = mongoose.model('Essay', essaySchema);

// Route kiểm tra server
app.get('/', (req, res) => {
    res.send('Hệ thống Quản lý Bài văn của Vy và Tân đã sẵn sàng!');
});

app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});