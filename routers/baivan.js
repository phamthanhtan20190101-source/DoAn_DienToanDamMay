const express = require('express');
const router = express.Router();
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');

// Import các Models
const BaiVan = require('../models/baivan');
const TaiKhoan = require('../models/taikhoan');
const TheLoai = require('../models/theloai');
const YeuThich = require('../models/yeuthich');
const LichSu = require('../models/lichsu');

// 1. CẤU HÌNH UPLOAD & GOOGLE DRIVE
const upload = multer({ dest: 'uploads/' });
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });
const FOLDER_ID = '1Vl98WrQU_ET7aACKP4autYyWenefWeB8'; // <--- Đảm bảo ID này chính xác

// ==========================================
// PHẦN 1: GIAO DIỆN NGƯỜI DÙNG (USER)
// ==========================================

// Trang chủ: Hiển thị bài viết mới nhất
router.get('/', async (req, res) => {
    try {
        const danhSachBai = await BaiVan.find({ TrangThai: 'DaDuyet' })
            .populate('TacGia_id', 'HoTen')
            .sort({ NgayDang: -1 });
        res.render('home', { 
            danhSachBai, 
            user: req.session.user, 
            isTuSach: false,
            titlePage: 'Tác Phẩm Nổi Bật' 
        }); 
    } catch (err) {
        res.status(500).send('Lỗi tải trang chủ: ' + err.message);
    }
});

// Route hiển thị Thư viện (phong cách Tao Đàn)
router.get('/danh-sach', async (req, res) => {
    try {
        const selectedCate = req.query.theloai;
        const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
        const limit = 9; // Số lượng bài viết trên mỗi trang
        const skip = (page - 1) * limit;

        let query = { TrangThai: 'DaDuyet' };
        if (selectedCate) query.TheLoai_id = selectedCate;

        // 1. Lấy danh sách bài viết theo trang
        const danhSachBai = await BaiVan.find(query)
            .populate('TacGia_id', 'HoTen')
            .populate('TheLoai_id', 'TenTheLoai')
            .sort({ NgayDang: -1 })
            .skip(skip)
            .limit(limit);

        // 2. Tính toán tổng số trang
        const totalPosts = await BaiVan.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit);

        // 3. Lấy Top 10 và Thể loại (giữ nguyên như cũ)
        const topBaiViet = await BaiVan.find({ TrangThai: 'DaDuyet' }).sort({ LuotXem: -1 }).limit(10);
        const danhSachTheLoai = await TheLoai.find();

        res.render('thu-vien', { 
            titlePage: 'Thư Viện Tài Liệu',
            danhSachBai,
            topBaiViet,
            danhSachTheLoai,
            currentCate: selectedCate,
            currentPage: page,
            totalPages: totalPages,
            user: req.session.user
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Trang Tủ Sách (Yêu thích và Lịch sử)
// Cả Thư viện và Tủ sách đều dùng chung giao diện tu-sach.ejs
router.get('/tu-sach', async (req, res) =>  {
    if (!req.session.user) return res.redirect('/dang-nhap');
    
    try {
        const userId = req.session.user._id;

        // 1. Lấy dữ liệu Yêu thích
        const dataYeuThich = await YeuThich.find({ TaiKhoan_id: userId })
            .populate({ path: 'BaiVan_id', populate: { path: 'TacGia_id' } })
            .sort({ createdAt: -1 });
        
        // 2. Lấy dữ liệu Lịch sử
        const dataLichSu = await LichSu.find({ TaiKhoan_id: userId })
            .populate({ path: 'BaiVan_id', populate: { path: 'TacGia_id' } })
            .sort({ NgayXem: -1 }).limit(20);

        // 3. Lấy TẤT CẢ bài văn đã duyệt (Dành cho tab Thư viện)
        const tatCaBaiVan = await BaiVan.find({ TrangThai: 'DaDuyet' })
            .populate('TacGia_id', 'HoTen')
            .sort({ NgayDang: -1 });

        const danhSachYeuThich = dataYeuThich.map(item => item.BaiVan_id).filter(b => b);
        const danhSachLichSu = dataLichSu.map(item => item.BaiVan_id).filter(b => b);

        res.render('tu-sach', { 
            user: req.session.user, 
            danhSachYeuThich, 
            danhSachLichSu,
            tatCaBaiVan, 
            titlePage: req.path === '/danh-sach' ? 'Thư Viện Tài Liệu' : 'Tủ Sách Của Tôi'
        });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// Trang chi tiết bài văn + Tự động tăng lượt xem & lưu lịch sử
router.get('/bai-van/:id', async (req, res) => {
    try {
        // CẬP NHẬT TẠI ĐÂY: Sử dụng findByIdAndUpdate để cộng dồn LuotXem
        const bai = await BaiVan.findByIdAndUpdate(
            req.params.id, 
            { $inc: { LuotXem: 1 } }, // Tăng LuotXem thêm 1
            { new: true } // Trả về dữ liệu mới nhất sau khi cộng
        )
        .populate('TacGia_id', 'HoTen')
        .populate('TheLoai_id', 'TenTheLoai');
        
        if (!bai) return res.status(404).send('Không tìm thấy bài văn');

        let isYeuThich = false;
        if (req.session.user) {
            const userId = req.session.user._id;
            
            // 1. Cập nhật lịch sử xem
            await LichSu.findOneAndUpdate(
                { TaiKhoan_id: userId, BaiVan_id: bai._id },
                { NgayXem: new Date() },
                { upsert: true, new: true }
            );

            // 2. Kiểm tra trạng thái yêu thích
            const checkYeuThich = await YeuThich.findOne({ TaiKhoan_id: userId, BaiVan_id: bai._id });
            if (checkYeuThich) isYeuThich = true;
        }

        res.render('chi-tiet-bai-van', { bai, user: req.session.user, isYeuThich });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});
// API xử lý Yêu thích (Thả tim/Bỏ tim) - Dùng AJAX
router.post('/api/yeu-thich', async (req, res) => {
    if (!req.session.user) return res.json({ success: false, msg: 'Vui lòng đăng nhập!' });
    try {
        const userId = req.session.user._id;
        const baiId = req.body.BaiVan_id;
        const existing = await YeuThich.findOne({ TaiKhoan_id: userId, BaiVan_id: baiId });

        if (existing) {
            await YeuThich.findByIdAndDelete(existing._id);
            res.json({ success: true, isYeuThich: false });
        } else {
            await YeuThich.create({ TaiKhoan_id: userId, BaiVan_id: baiId });
            res.json({ success: true, isYeuThich: true });
        }
    } catch (err) {
        res.json({ success: false, msg: 'Lỗi hệ thống!' });
    }
});

// Trang gửi bài viết
router.get('/gui-bai', async (req, res) => {
    if (!req.session.user) return res.redirect('/dang-nhap');
    try {
        const danhSachTheLoai = await TheLoai.find().sort({ TenTheLoai: 1 });
        res.render('index', { danhSachTheLoai, user: req.session.user }); 
    } catch (err) {
        res.status(500).send('Lỗi tải trang gửi bài: ' + err.message);
    }
});

// Xử lý upload file lên Drive & Database - Trả về JSON cho Toast notification
router.post('/upload', upload.single('essayFile'), async (req, res) => {
    try {
        if (!req.session.user) return res.json({ success: false, msg: '❌ Vui lòng đăng nhập!' });
        
        const file = req.file;
        if (!file) return res.json({ success: false, msg: '❌ Bạn chưa chọn tệp tin!' });

        let theLoaiId = req.body.TheLoai_id;
        // Xử lý nếu ID gửi lên là ID mẫu từ giao diện tĩnh
        if (theLoaiId && theLoaiId.startsWith('ID_MAU')) {
            const defaultTL = await TheLoai.findOne(); 
            if(defaultTL) theLoaiId = defaultTL._id;
        }

        // Upload lên Google Drive
        const driveRes = await drive.files.create({
            requestBody: { name: file.originalname, parents: [FOLDER_ID] },
            media: { mimeType: file.mimetype, body: fs.createReadStream(file.path) },
            fields: 'id',
            supportsAllDrives: true 
        });

        // Cấp quyền xem file công khai (Reader)
        await drive.permissions.create({
            fileId: driveRes.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        const isAdmin = (req.session.user.QuyenHan && req.session.user.QuyenHan.toLowerCase() === 'admin');

        const newPost = new BaiVan({
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            TheLoai_id: theLoaiId,
            TacGia_id: req.session.user._id,
            DriveFileId: driveRes.data.id,
            TrangThai: isAdmin ? 'DaDuyet' : 'ChoDuyet'
        });

        await newPost.save();
        fs.unlinkSync(file.path); // Xóa file tạm trong thư mục uploads/
        
        const successMsg = isAdmin 
            ? '🎉 Đăng bài thành công! Bài viết đã hiển thị ngay.' 
            : '🎉 Đã gửi bài thành công! Vui lòng chờ Admin duyệt.';
            
        res.json({ success: true, msg: successMsg });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'Lỗi Upload: ' + err.message });
    }
});

// ==========================================
// PHẦN 2: CHỨC NĂNG QUẢN TRỊ (ADMIN)
// ==========================================

// Kiểm tra quyền Admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.QuyenHan.toLowerCase() === 'admin') {
        next();
    } else {
        res.status(403).send('Cấm truy cập: Bạn không có quyền quản trị.');
    }
};

// Dashboard Thống kê
router.get('/admin/dashboard', checkAdmin, async (req, res) => {
    try {
        const stats = {
            totalEssays: await BaiVan.countDocuments(),
            totalUsers: await TaiKhoan.countDocuments({ QuyenHan: 'user' }),
            pending: await BaiVan.countDocuments({ TrangThai: 'ChoDuyet' })
        };
        res.render('admin/dashboard', { stats, user: req.session.user });
    } catch (err) { res.status(500).send(err.message); }
});

// Trang danh sách bài chờ duyệt
router.get('/admin/duyet-bai', checkAdmin, async (req, res) => {
    try {
        const danhSachChoDuyet = await BaiVan.find({ TrangThai: 'ChoDuyet' }).populate('TacGia_id', 'HoTen');
        res.render('admin/duyet-bai', { danhSachChoDuyet, user: req.session.user });
    } catch (err) { res.status(500).send(err.message); }
});

// Xử lý nút Chấp nhận/Từ chối bài viết
router.post('/admin/xu-ly-bai/:id', checkAdmin, async (req, res) => {
    try {
        const trangThaiMoi = req.body.action === 'chap-nhan' ? 'DaDuyet' : 'BiTuChoi';
        await BaiVan.findByIdAndUpdate(req.params.id, { TrangThai: trangThaiMoi });
        res.redirect('/admin/duyet-bai');
    } catch (err) { res.status(500).send(err.message); }
});

// Trang quản lý tất cả bài viết
router.get('/admin/quan-ly-bai-viet', checkAdmin, async (req, res) => {
    try {
        const danhSachTatCa = await BaiVan.find()
            .populate('TacGia_id', 'HoTen')
            .populate('TheLoai_id', 'TenTheLoai')
            .sort({ NgayDang: -1 });
        res.render('admin/quan-ly-bai-viet', { danhSachTatCa, user: req.session.user });
    } catch (err) { res.status(500).send('Lỗi: ' + err.message); }
});

// Xóa bài viết
router.get('/admin/xoa-bai/:id', checkAdmin, async (req, res) => {
    try {
        await BaiVan.findByIdAndDelete(req.params.id);
        res.redirect('/admin/quan-ly-bai-viet');
    } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;

