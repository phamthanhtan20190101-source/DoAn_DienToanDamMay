// --- 1. KHAI BÁO THƯ VIỆN ---
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

// --- 2. NHẬP CÁC MODEL (Phục vụ cho hàm /setup dữ liệu) ---
const TaiKhoan = require('./models/taikhoan');
const TheLoai = require('./models/theloai');
const BaiVan = require('./models/baivan');
const BinhLuan = require('./models/binhluan');
const ThongBao = require('./models/thongbao');

// --- 3. NHẬP HỆ THỐNG ROUTER TRUNG TÂM ---
// Node.js sẽ tự động tìm đến file index.js bên trong thư mục routers
const appRoutes = require('./routers'); 

const app = express();

// Cấp quyền truy cập công khai cho thư mục 'public'
app.use(express.static('public'));
const port = 3000;

// --- 4. CẤU HÌNH MIDDLEWARE & SESSION ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Cấu hình Két sắt lưu trạng thái đăng nhập
app.use(session({
    secret: 'tram_van_secret_key_cua_vy_va_tan',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Hiệu lực trong 1 ngày
}));

// MIDDLEWARE TỔNG HỢP: Cấu hình Footer, User và Thông báo
app.use(async (req, res, next) => {
    try {
        // 1. Lấy cấu hình Footer (globalConfig)
        const CauHinh = require('./models/cauhinh');
        let config = await CauHinh.findOne();
        if (!config) config = await CauHinh.create({}); 
        res.locals.globalConfig = config;

        // 2. Nhận diện người dùng cho toàn bộ các trang EJS
        res.locals.user = req.session.user || null;
        
        // 3. Tự động lấy thông báo nếu có người dùng đăng nhập
        if (req.session.user) {
            res.locals.thongBaoList = await ThongBao.find({ TaiKhoan_id: req.session.user._id })
                                            .sort({ NgayTao: -1 }).limit(5);
            res.locals.thongBaoChuaDoc = await ThongBao.countDocuments({ TaiKhoan_id: req.session.user._id, DaDoc: false });
        } else {
            res.locals.thongBaoList = [];
            res.locals.thongBaoChuaDoc = 0;
        }
    } catch (err) {
        console.error("Lỗi hệ thống Middleware:", err);
        res.locals.globalConfig = {};
        res.locals.user = null;
        res.locals.thongBaoList = [];
        res.locals.thongBaoChuaDoc = 0;
    }
    next();
});

// --- 5. CẤU HÌNH GIAO DIỆN (EJS) & TÀI NGUYÊN TĨNH ---
app.set('view engine', 'ejs');
app.set('views', './views'); 
app.use(express.static('public')); 

// --- 6. KẾT NỐI MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// ==========================================
// --- 7. TÍCH HỢP ROUTER ---
// Thay vì viết app.get/app.post rườm rà, chúng ta gọi trạm trung chuyển
// ==========================================
app.use('/', appRoutes);

// Route mồi dữ liệu (Giữ lại ở file gốc để quản lý tập trung)
app.get('/setup', async (req, res) => {
    try {
        const theLoai = await TheLoai.findOneAndUpdate(
            { TenTheLoai: 'Văn Nghị Luận' },
            { MoTa: 'Các bài văn về tư duy và xã hội' },
            { upsert: true, new: true }
        );

        const admin = await TaiKhoan.findOneAndUpdate(
            { TenDangNhap: 'admin_vy' },
            { HoTen: 'Vy Admin', MatKhau: '123456', QuyenHan: 'admin' },
            { upsert: true, new: true }
        );

        await BaiVan.findOneAndUpdate(
            { TieuDe: 'Phân tích bài thơ Sóng' },
            { 
                TomTat: 'Một bài văn mẫu hay về tác phẩm của Xuân Quỳnh',
                TheLoai_id: theLoai._id,
                TacGia_id: admin._id,
                DriveFileId: 'sample_id_123',
                TrangThai: 'DaDuyet'
            },
            { upsert: true, new: true }
        );

        res.send('🚀 Khởi tạo Database thành công! Giờ bạn có thể dùng các Route đã tách.');
    } catch (err) {
        res.status(500).send('❌ Lỗi khởi tạo: ' + err.message);
    }
});

// --- 8. KHỞI CHẠY SERVER ---
app.listen(port, () => {
    console.log(`🚀 Server Trạm Văn đang chạy tại http://localhost:${port}`);
});