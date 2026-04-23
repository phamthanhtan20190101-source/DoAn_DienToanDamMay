const express = require('express');
const router = express.Router();
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Khởi tạo AI với Key từ file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log("Kiểm tra Key:", process.env.GEMINI_API_KEY ? "Đã nhận Key ✅" : "Chưa nhận Key ❌");
// Import các Models
const BaiVan = require('../models/baivan');
const TaiKhoan = require('../models/taikhoan');
const TheLoai = require('../models/theloai');
const YeuThich = require('../models/yeuthich');
const LichSu = require('../models/lichsu');
const ChuDe = require('../models/chude');
const Banner = require('../models/banner');
const BinhLuan = require('../models/binhluan');

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
// Trang chủ: Hiển thị bài viết mới nhất (Đã nâng cấp Zing MP3 Modules)
router.get('/', async (req, res) => {
    try {
        // 1. Lấy danh sách Banner đang Bật
        const danhSachBanner = await Banner.find({ TrangThai: true }).sort({ createdAt: -1 });

        // 2. Lấy danh sách Chủ đề để cuộn ngang (Lấy 3 chủ đề)
        const cacChuDe = await ChuDe.find().limit(3);
        
        // 3. Lọc bài viết cho từng Chủ đề
        let baiVietTheoChuDe = [];
        for (let cd of cacChuDe) {
            // Tìm các bài văn có chứa ID chủ đề này, lấy 8 bài để cuộn ngang
            const baiViet = await BaiVan.find({ 
                ChuDe_id: cd._id, 
                TrangThai: 'DaDuyet' 
            })
            .populate('TacGia_id', 'HoTen')
            .populate('TheLoai_id', 'TenTheLoai')
            .sort({ createdAt: -1 })
            .limit(8);
            
            // Chỉ đẩy ra ngoài nếu chủ đề đó có bài viết
            if (baiViet.length > 0) {
                baiVietTheoChuDe.push({ chuDe: cd, danhSach: baiViet });
            }
        }

        // Lấy thêm danh sách bài mới nhất (để dự phòng nếu chưa có bài theo chủ đề)
        const danhSachBai = await BaiVan.find({ TrangThai: 'DaDuyet' })
            .populate('TacGia_id', 'HoTen')
            .populate('TheLoai_id', 'TenTheLoai')
            .sort({ NgayDang: -1 })
            .limit(6);

        //Lấy Top 5 bài viết có Lượt Xem cao nhất cho Bảng xếp hạng
        const topBaiViet = await BaiVan.find({ TrangThai: 'DaDuyet' })
            .populate('TacGia_id', 'HoTen')
            .sort({ LuotXem: -1 }) // Sắp xếp giảm dần theo lượt xem
            .limit(5); // Chỉ lấy 5 bài

        res.render('home', { 
            
            danhSachBanner, 
            baiVietTheoChuDe,
            danhSachBai, // Gửi thêm list cũ đề phòng
            topBaiViet, // Gửi danh sách top bài viết
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

// Trang chi tiết bài văn + Tự động tăng lượt xem & lưu lịch sử & LOAD BÌNH LUẬN
router.get('/bai-van/:id', async (req, res) => {
    try {
        const bai = await BaiVan.findByIdAndUpdate(
            req.params.id, 
            { $inc: { LuotXem: 1 } },
            { new: true }
        )
        .populate('TacGia_id', 'HoTen')
        .populate('TheLoai_id', 'TenTheLoai');
        
        if (!bai) return res.status(404).send('Không tìm thấy bài văn');

        // --- LẤY DANH SÁCH BÌNH LUẬN ---
        const danhSachBinhLuan = await BinhLuan.find({ BaiVan_id: bai._id })
            .populate('TaiKhoan_id', 'HoTen')
            .sort({ NgayBinhLuan: -1 }); // Mới nhất xếp trên

        let isYeuThich = false;
        if (req.session.user) {
            const userId = req.session.user._id;
            await LichSu.findOneAndUpdate(
                { TaiKhoan_id: userId, BaiVan_id: bai._id },
                { NgayXem: new Date() },
                { upsert: true, new: true }
            );
            const checkYeuThich = await YeuThich.findOne({ TaiKhoan_id: userId, BaiVan_id: bai._id });
            if (checkYeuThich) isYeuThich = true;
        }

        // Truyền danhSachBinhLuan ra ngoài giao diện
        res.render('chi-tiet-bai-van', { 
            bai, 
            user: req.session.user, 
            isYeuThich, 
            danhSachBinhLuan 
        });
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
        res.render('index', { titlePage: 'Gửi Bài Viết', danhSachTheLoai, user: req.session.user });
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
// ==========================================
// QUẢN LÝ CHỦ ĐỀ (Góc chữa lành, Sĩ tử 12...)
// ==========================================

// 1. Hiển thị trang Quản lý Chủ đề
router.get('/admin/quan-ly-chu-de', checkAdmin, async (req, res) => {
    try {
        const danhSachChuDe = await ChuDe.find().sort({ createdAt: -1 });
        res.render('admin/quan-ly-chu-de', { 
            danhSachChuDe, 
            user: req.session.user, 
            error: null 
        });
    } catch (err) { 
        res.status(500).send('Lỗi: ' + err.message); 
    }
});

// 2. Xử lý Thêm Chủ đề mới
router.post('/admin/them-chu-de', checkAdmin, async (req, res) => {
    try {
        const { TenChuDe, MoTa } = req.body;
        const newChuDe = new ChuDe({ TenChuDe, MoTa });
        await newChuDe.save();
        res.redirect('/admin/quan-ly-chu-de');
    } catch (err) { 
        res.status(500).send('Lỗi thêm chủ đề: ' + err.message); 
    }
});

// 3. Xử lý Xóa Chủ đề
router.get('/admin/xoa-chu-de/:id', checkAdmin, async (req, res) => {
    try {
        await ChuDe.findByIdAndDelete(req.params.id);
        res.redirect('/admin/quan-ly-chu-de');
    } catch (err) { 
        res.status(500).send('Lỗi xóa chủ đề: ' + err.message); 
    }
});
// 4. Hiển thị form Sửa Chủ đề
router.get('/admin/sua-chu-de/:id', checkAdmin, async (req, res) => {
    try {
        const chuDe = await ChuDe.findById(req.params.id);
        if (!chuDe) return res.status(404).send('Không tìm thấy chủ đề');
        res.render('admin/sua-chu-de', { chuDe, user: req.session.user });
    } catch (err) { 
        res.status(500).send('Lỗi: ' + err.message); 
    }
});
// Route: Hiển thị danh sách bài viết cá nhân
router.get('/bai-da-dang', async (req, res) => {
    // 1. Kiểm tra đăng nhập
    if (!req.session.user) return res.redirect('/dang-nhap');

    try {
        const userId = req.session.user._id;

        // 2. Lấy danh sách bài viết của chính user đó
        const danhSachBai = await BaiVan.find({ TacGia_id: userId })
            .populate('TheLoai_id', 'TenTheLoai') // Lấy tên thể loại
            .sort({ NgayDang: -1 }); // Mới nhất xếp trên cùng

        // 3. Trả về giao diện
        res.render('bai-da-dang', { 
            
            danhSachBai, 
            user: req.session.user,
           titlePage: 'Bài Đã Đăng' 
        });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});
// 5. Xử lý Cập nhật Chủ đề vào Database
router.post('/admin/sua-chu-de/:id', checkAdmin, async (req, res) => {
    try {
        const { TenChuDe, MoTa } = req.body;
        // Tìm chủ đề theo ID và cập nhật nội dung mới
        await ChuDe.findByIdAndUpdate(req.params.id, { TenChuDe, MoTa });
        res.redirect('/admin/quan-ly-chu-de'); // Sửa xong thì quay lại danh sách
    } catch (err) { 
        res.status(500).send('Lỗi cập nhật: ' + err.message); 
    }
});

// ==========================================
// QUẢN LÝ BANNER (Trang Chủ)
// ==========================================
// Cấu hình Multer để lưu ảnh Banner vào thư mục public/uploads/banners
const storageBanner = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/banners') // Lưu vào đây
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname) // Đổi tên file để không bị trùng
    }
});
const uploadBanner = multer({ storage: storageBanner });

// 1. Hiển thị trang Quản lý Banner
router.get('/admin/quan-ly-banner', checkAdmin, async (req, res) => {
    try {
        const danhSachBanner = await Banner.find().sort({ createdAt: -1 });
        // Lấy danh sách các bài văn đã duyệt để thả vào ô chọn Link
        const danhSachBai = await BaiVan.find({ TrangThai: 'DaDuyet' }).select('_id TieuDe').sort({ NgayDang: -1 });
        
        res.render('admin/quan-ly-banner', { danhSachBanner, danhSachBai, user: req.session.user });
    } catch (err) { 
        res.status(500).send('Lỗi: ' + err.message); 
    }
});

// 2. Xử lý Thêm Banner mới (Hỗ trợ Upload File)
router.post('/admin/them-banner', checkAdmin, uploadBanner.single('HinhAnhFile'), async (req, res) => {
    try {
        const { TieuDe, DuongDan } = req.body;
        
        // Tạo đường dẫn ảnh để lưu vào DB (Dấu / ở đầu để web hiểu là lấy từ thư mục public)
        const duongDanAnh = req.file ? '/uploads/banners/' + req.file.filename : '';

        const newBanner = new Banner({ 
            TieuDe, 
            HinhAnh: duongDanAnh, // Lưu đường dẫn ảnh local
            DuongDan: DuongDan || '#', 
            TrangThai: true 
        });
        await newBanner.save();
        res.redirect('/admin/quan-ly-banner');
    } catch (err) { 
        res.status(500).send('Lỗi thêm banner: ' + err.message); 
    }
});

// 3. Xóa Banner
router.get('/admin/xoa-banner/:id', checkAdmin, async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.redirect('/admin/quan-ly-banner');
    } catch (err) { 
        res.status(500).send('Lỗi xóa banner: ' + err.message); 
    }
});

// Hiển thị form Sửa Thể loại
router.get('/admin/sua-the-loai/:id', checkAdmin, async (req, res) => {
    try {
        const theLoai = await TheLoai.findById(req.params.id);
        if (!theLoai) return res.status(404).send('Không tìm thấy thể loại');
        res.render('admin/sua-the-loai', { theLoai, user: req.session.user });
    } catch (err) { 
        res.status(500).send('Lỗi: ' + err.message); 
    }
});

// Xử lý Cập nhật Thể loại vào Database
router.post('/admin/sua-the-loai/:id', checkAdmin, async (req, res) => {
    try {
        const { TenTheLoai, MoTa } = req.body;
        // Cập nhật tên và mô tả mới
        await TheLoai.findByIdAndUpdate(req.params.id, { TenTheLoai, MoTa });
        // Sửa xong thì quay lại trang danh sách thể loại
        res.redirect('/admin/them-the-loai'); 
    } catch (err) { 
        res.status(500).send('Lỗi cập nhật: ' + err.message); 
    }
});
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
// Hiển thị form Sửa Bài Viết (Để gán Chủ đề)
router.get('/admin/sua-bai/:id', checkAdmin, async (req, res) => {
    try {
        const bai = await BaiVan.findById(req.params.id);
        if (!bai) return res.status(404).send('Không tìm thấy bài viết');
        
        // Lấy danh sách Thể loại và Chủ đề để đưa vào menu thả xuống (Dropdown)
        const danhSachTheLoai = await TheLoai.find();
        const danhSachChuDe = await ChuDe.find();
        
        res.render('admin/sua-bai', { bai, danhSachTheLoai, danhSachChuDe, user: req.session.user });
    } catch (err) { 
        res.status(500).send('Lỗi: ' + err.message); 
    }
});

// Xử lý Cập nhật Bài Viết vào Database
router.post('/admin/sua-bai/:id', checkAdmin, async (req, res) => {
    try {
        const { TieuDe, TheLoai_id, ChuDe_id, TrangThai } = req.body;
        
        // Cập nhật các thông tin mới
        await BaiVan.findByIdAndUpdate(req.params.id, { 
            TieuDe, 
            TheLoai_id, 
            ChuDe_id: ChuDe_id ? ChuDe_id : null, // Nếu không chọn chủ đề thì để trống
            TrangThai 
        });
        
        res.redirect('/admin/quan-ly-bai-viet'); 
    } catch (err) { 
        res.status(500).send('Lỗi cập nhật: ' + err.message); 
    }
});
//chat bot

// API xử lý Chatbot AI
router.post('/api/chat', async (req, res) => {
    try {
        // Đưa dòng này vào bên trong hàm try
        // Thử đổi từ "gemini-1.5-flash" sang "gemini-1.5-flash-latest"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        
        const prompt = `Bạn là trợ lý ảo tên "Trạm Trưởng" của website Trạm Văn. 
                        Hãy trả lời ngắn gọn, thân thiện bằng tiếng Việt. 
                        Câu hỏi: ${req.body.message}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, text: response.text() });
    } catch (err) {
        console.error("LỖI :", err);
        res.json({ success: false, text: "Trạm Trưởng đang bận học bài, thử lại sau nhé!" });
    }
});
module.exports = router;

