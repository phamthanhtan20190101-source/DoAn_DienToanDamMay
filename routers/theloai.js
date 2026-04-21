const express = require('express');
const router = express.Router();
const ObjectTheLoai = require('../models/theloai'); // Lùi 1 cấp để vào thư mục models

// 1. Hiển thị trang Danh mục các thể loại
router.get('/danh-muc', async (req, res) => {
    try {
        // Sau này mình sẽ dùng ObjectTheLoai.find() để lấy dữ liệu từ DB truyền ra giao diện
        res.send('🚧 Giao diện Danh mục Thể loại đang chờ lắp ráp...');
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// 2. Hiển thị danh sách các bài văn thuộc 1 thể loại cụ thể (Lọc bài viết)
router.get('/the-loai/:id', async (req, res) => {
    // :id là tham số động. VD: /the-loai/123456
    res.send(`🚧 Đang tải các bài văn thuộc Thể loại có ID: ${req.params.id}...`);
});

module.exports = router;