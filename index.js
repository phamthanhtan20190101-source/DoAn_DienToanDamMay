const session = require('express-session');
const bcrypt = require('bcrypt');


require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');


// 1. Import các model
const TaiKhoan = require('./models/taikhoan');
const TheLoai = require('./models/theloai');
const BaiVan = require('./models/baivan');
const BinhLuan = require('./models/binhluan');

const app = express();
const port = 3000;

// Cấu hình Session (Két sắt lưu trạng thái đăng nhập)
app.use(session({
    secret: 'tram_van_secret_key_cua_vy_va_tan',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Lưu đăng nhập trong 1 ngày
}));

// Biến toàn cục cho View (Giúp Navbar biết ai đang đăng nhập)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// 2. Middleware
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 3. Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', './views'); 
app.use(express.static('public')); 

// 4. Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 5. Route khởi tạo toàn bộ Collection (Chạy 1 lần duy nhất)
app.get('/setup', async (req, res) => {
    try {
        // a. Tạo Thể loại mẫu
        const theLoai = await TheLoai.findOneAndUpdate(
            { TenTheLoai: 'Văn Nghị Luận' },
            { MoTa: 'Các bài văn về tư duy và xã hội' },
            { upsert: true, new: true }
        );

        // b. Tạo Tài khoản Admin mẫu
        const admin = await TaiKhoan.findOneAndUpdate(
            { TenDangNhap: 'admin_vy' },
            { HoTen: 'Vy Admin', MatKhau: '123456', QuyenHan: 'admin' },
            { upsert: true, new: true }
        );

        // c. Tạo Bài văn mẫu (Sử dụng ID của Thể loại và Tài khoản vừa tạo)
        const baiVan = await BaiVan.findOneAndUpdate(
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

        // d. Tạo Bình luận mẫu (Sử dụng ID của Bài văn và Tài khoản)
        await BinhLuan.findOneAndUpdate(
            { NoiDung: 'Bài viết rất chi tiết, cảm ơn bạn!' },
            { 
                BaiVan_id: baiVan._id,
                NguoiDung_id: admin._id
            },
            { upsert: true, new: true }
        );

        res.send('🚀 Chúc mừng Vy! Đã khởi tạo thành công 4 Collection: taikhoan, theloai, baivan, binhluan.');
    } catch (err) {
        res.status(500).send('❌ Lỗi khởi tạo: ' + err.message);
    }
});

// 6. Route trang chủ
app.get('/', (req, res) => {
    res.render('index'); 
});

app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});


// Hiển thị trang Đăng nhập
app.get('/dang-nhap', (req, res) => {
    res.render('login'); 
});

// Xử lý logic Đăng nhập
app.post('/dang-nhap', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau } = req.body;
        // Tìm user trong Database
        const user = await TaiKhoan.findOne({ TenDangNhap: TenDangNhap });

        if (!user) {
            return res.send('❌ Tài khoản không tồn tại!'); // Sau này mình sẽ làm giao diện báo lỗi đẹp hơn
        }

        // TẠM THỜI: Kiểm tra mật khẩu trực tiếp (Vì hàm /setup mình lưu mật khẩu là '123456')
        // Khi làm chức năng Đăng ký, mình sẽ dùng bcrypt.compare() sau nhé.
        if (user.MatKhau === MatKhau) {
            // Đăng nhập thành công -> Lưu vào session
            req.session.user = { 
                _id: user._id, 
                HoTen: user.HoTen, 
                QuyenHan: user.QuyenHan 
            };
            return res.redirect('/'); // Chuyển về trang chủ
        } else {
            return res.send('❌ Sai mật khẩu!');
        }
    } catch (err) {
        res.status(500).send('Lỗi Server: ' + err.message);
    }
});

// Xử lý Đăng xuất
app.get('/dang-xuat', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Route test chức năng: Thêm bài văn vào Bộ sưu tập của admin_vy
app.get('/test-luu-bai', async (req, res) => {
    try {
        // 1. Tìm một bài văn bất kỳ trong Database
        const baiVanHienTai = await BaiVan.findOne(); 
        
        if (!baiVanHienTai) {
            return res.send('❌ Chưa có bài văn nào trong kho! Hãy chạy /setup trước.');
        }

        // 2. Tìm tài khoản admin_vy và "nhét" ID bài văn vào DanhSachLuu
        const user = await TaiKhoan.findOneAndUpdate(
            { TenDangNhap: 'admin_vy' }, // Tìm ai?
            { $push: { DanhSachLuu: baiVanHienTai._id } }, // Hành động: Đẩy ID bài văn vào mảng
            { new: true } // Trả về kết quả mới nhất
        );

        res.json({
            message: '✅ Đã lưu bài thành công vào Bộ sưu tập!',
            thongTinTaiKhoan: user
        });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});