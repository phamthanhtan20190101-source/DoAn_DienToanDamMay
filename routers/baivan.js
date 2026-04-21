const express = require('express');
const router = express.Router();
const BaiVan = require('../models/baivan');
const TaiKhoan = require('../models/taikhoan');


// 1. Hiển thị Trang chủ (Giao diện Tác Phẩm Nổi Bật)
router.get('/', async (req, res) => {
    // Tạm thời render giao diện, sau này sẽ dùng BaiVan.find() để lấy bài từ DB
    res.render('home'); 
});

// 2. Hiển thị trang Gửi Bài Viết (Tách ra một đường dẫn riêng)
router.get('/gui-bai', (req, res) => {
    res.render('index'); // Vẫn dùng file index.ejs hiện tại làm trang nộp bài
});
// 2. Route Nhận dữ liệu nộp bài (Chuẩn bị cho bước dùng Multer upload file)
router.post('/upload', (req, res) => {
    
});

// 3. Hiển thị danh sách Kho Tài Liệu
router.get('/danh-sach', async (req, res) => {
    
});

// 4. Test lưu bài vào Bộ Sưu Tập / Tủ Sách
router.get('/test-luu-bai', async (req, res) => {
    try {
        const baiVanHienTai = await BaiVan.findOne(); 
        if (!baiVanHienTai) {
            return res.send('❌ Chưa có bài văn nào trong kho! Hãy chạy /setup trước.');
        }

        const user = await TaiKhoan.findOneAndUpdate(
            { TenDangNhap: 'admin_vy' }, 
            { $push: { DanhSachLuu: baiVanHienTai._id } }, 
            { new: true } 
        );

        res.json({
            message: '✅ Đã lưu bài thành công vào Tủ sách!',
            thongTinTaiKhoan: user
        });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

module.exports = router;