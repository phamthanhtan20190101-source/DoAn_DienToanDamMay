const express = require('express');
const router = express.Router();
const BinhLuan = require('../models/binhluan');

// 1. Xử lý nhận dữ liệu khi người dùng bấm nút "Gửi bình luận"
router.post('/them-binh-luan', async (req, res) => {
    try {
        // Kiểm tra bảo mật: Chưa đăng nhập thì không cho bình luận
        if (!req.session.user) {
            return res.send('❌ Bạn cần đăng nhập để tham gia bình luận!');
        }
        
        // Đoạn này sau này sẽ lấy dữ liệu từ Form (req.body) và lưu vào Database
        res.send('🚧 Tính năng Gửi Bình Luận đang được xây dựng...');
    } catch (err) {
        res.status(500).send('Lỗi Server: ' + err.message);
    }
});

// 2. Xóa bình luận (Tính năng dành cho Admin hoặc chủ nhân của bình luận)
router.get('/xoa-binh-luan/:id', async (req, res) => {
    res.send(`🚧 Tính năng xóa bình luận (ID: ${req.params.id}) đang được xây dựng...`);
});

module.exports = router;