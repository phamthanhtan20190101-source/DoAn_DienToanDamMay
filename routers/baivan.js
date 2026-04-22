const express = require('express');
const router = express.Router();
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');

const BaiVan = require('../models/baivan');
const TaiKhoan = require('../models/taikhoan');
const TheLoai = require('../models/theloai');

// 1. CẤU HÌNH UPLOAD & GOOGLE DRIVE
const upload = multer({ dest: 'uploads/' }); // Nhớ tạo thư mục 'uploads' ở ngoài cùng project
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = '1Jx5ami51Exkt8PvnDZfjdR2SeOytecuZ?usp=drive_link'; // <--- NHỚ ĐỔI ID theo drive!

// ==========================================
// PHẦN 1: GIAO DIỆN NGƯỜI DÙNG (USER)
// ==========================================

// Trang chủ: Chỉ hiện những bài đã được Admin duyệt
router.get('/', async (req, res) => {
    try {
        const danhSachBai = await BaiVan.find({ TrangThai: 'DaDuyet' })
                                        .populate('TacGia_id', 'HoTen')
                                        .sort({ NgayDang: -1 });
        res.render('home', { danhSachBai }); 
    } catch (err) {
        res.status(500).send('Lỗi tải trang chủ: ' + err.message);
    }
});

// Trang nộp bài viết
router.get('/gui-bai', (req, res) => {
    if (!req.session.user) return res.redirect('/dang-nhap');
    res.render('index'); 
});

// Các trang cá nhân (Sẽ thiết kế sau)
router.get('/bai-da-dang', (req, res) => {
    if (!req.session.user) return res.redirect('/dang-nhap');
    res.send('<h2>🚧 Tính năng Bài Đã Đăng đang được xây dựng...</h2><a href="/">Quay lại trang chủ</a>');
});

router.get('/tu-sach', (req, res) => {
    if (!req.session.user) return res.redirect('/dang-nhap');
    res.send('<h2>🚧 Tính năng Tủ Sách đang được xây dựng...</h2><a href="/">Quay lại trang chủ</a>');
});

router.get('/hom-thu', (req, res) => {
    if (!req.session.user) return res.redirect('/dang-nhap');
    res.send('<h2>🚧 Tính năng Hòm Thư đang được xây dựng...</h2><a href="/">Quay lại trang chủ</a>');
});

// Xử lý nộp bài lên Drive
router.post('/upload', upload.single('essayFile'), async (req, res) => {
    try {
        if (!req.session.user) return res.send('❌ Cần đăng nhập!');
        const file = req.file;
        if (!file) return res.send('❌ Chưa chọn file!');

        // Xử lý chống lỗi nếu giao diện gửi lên ID_MAU_1
        let theLoaiId = req.body.TheLoai_id;
        if (theLoaiId && theLoaiId.startsWith('ID_MAU')) {
            const theLoaiMacDinh = await TheLoai.findOne(); // Lấy tạm 1 thể loại có thật trong DB
            if(theLoaiMacDinh) theLoaiId = theLoaiMacDinh._id;
        }

        console.log('⏳ Đang đẩy lên Google Drive...');
        const driveRes = await drive.files.create({
            resource: { name: file.originalname, parents: [FOLDER_ID] },
            media: { mimeType: file.mimetype, body: fs.createReadStream(file.path) },
            fields: 'id'
        });

        const newPost = new BaiVan({
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            TheLoai_id: theLoaiId,
            TacGia_id: req.session.user._id,
            DriveFileId: driveRes.data.id,
            // Admin đăng thì duyệt luôn, User đăng thì chờ duyệt
            TrangThai: req.session.user.QuyenHan === 'admin' ? 'DaDuyet' : 'ChoDuyet'
        });

        await newPost.save();
        fs.unlinkSync(file.path); // Dọn rác
        res.send('🎉 Chúc mừng! Bài viết đã gửi thành công và đang chờ Admin duyệt.');
    } catch (err) {
        res.status(500).send('Lỗi Upload: ' + err.message);
    }
});

// ==========================================
// PHẦN 2: CHỨC NĂNG QUẢN TRỊ (ADMIN)
// ==========================================

// Dashboard Thống kê
router.get('/admin/dashboard', async (req, res) => {
    if (!req.session.user || req.session.user.QuyenHan !== 'admin') return res.status(403).send('Cấm truy cập');
    try {
        const stats = {
            totalEssays: await BaiVan.countDocuments(),
            totalUsers: await TaiKhoan.countDocuments({ QuyenHan: 'user' }),
            pending: await BaiVan.countDocuments({ TrangThai: 'ChoDuyet' })
        };
        res.render('admin/dashboard', { stats });
    } catch (err) { res.status(500).send(err.message); }
});

// Trang danh sách bài chờ duyệt
router.get('/admin/duyet-bai', async (req, res) => {
    if (!req.session.user || req.session.user.QuyenHan !== 'admin') return res.status(403).send('Cấm truy cập');
    try {
        const danhSachChoDuyet = await BaiVan.find({ TrangThai: 'ChoDuyet' }).populate('TacGia_id', 'HoTen');
        res.render('admin/duyet-bai', { danhSachChoDuyet });
    } catch (err) { res.status(500).send(err.message); }
});

// Xử lý nút Chấp nhận/Từ chối
router.post('/admin/xu-ly-bai/:id', async (req, res) => {
    if (!req.session.user || req.session.user.QuyenHan !== 'admin') return res.status(403).send('Cấm truy cập');
    try {
        const trangThaiMoi = req.body.action === 'chap-nhan' ? 'DaDuyet' : 'BiTuChoi';
        await BaiVan.findByIdAndUpdate(req.params.id, { TrangThai: trangThaiMoi });
        res.redirect('/admin/duyet-bai');
    } catch (err) { res.status(500).send(err.message); }
});

// Trang quản lý tất cả bài viết (Dành cho Admin)
router.get('/admin/quan-ly-bai-viet', async (req, res) => {
    // Kiểm tra quyền Admin
    if (!req.session.user || req.session.user.QuyenHan !== 'admin') {
        return res.status(403).send('Cấm truy cập');
    }

    try {
        // Lấy tất cả bài viết, nạp thêm thông tin Tác giả và Thể loại
        const danhSachTatCa = await BaiVan.find()
            .populate('TacGia_id', 'HoTen')
            .populate('TheLoai_id', 'TenTheLoai')
            .sort({ NgayDang: -1 });

        res.render('admin/quan-ly-bai-viet', { danhSachTatCa });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// Route xóa bài viết (Nếu Admin thấy bài vi phạm)
router.get('/admin/xoa-bai/:id', async (req, res) => {
    if (!req.session.user || req.session.user.QuyenHan !== 'admin') return res.status(403).send('Cấm truy cập');
    try {
        await BaiVan.findByIdAndDelete(req.params.id);
        res.redirect('/admin/quan-ly-bai-viet');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;