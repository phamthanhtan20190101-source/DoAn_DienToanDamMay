const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const TaiKhoan = require('../models/taikhoan');

// Hiển thị trang Đăng nhập
router.get('/dang-nhap', (req, res) => {
    res.render('login', { error: null, success: null }); 
});

// Xử lý logic Đăng nhập
// Xử lý logic Đăng nhập
router.post('/dang-nhap', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau } = req.body;
        const user = await TaiKhoan.findOne({ TenDangNhap: TenDangNhap });

        if (!user) {
            return res.render('login', { error: '❌ Tài khoản không tồn tại!', success: null });
        }

        // Kiểm tra tài khoản bị khóa
        if (user.KichHoat === 0) {
            return res.render('login', { error: '❌ Tài khoản của bạn đã bị khóa!', success: null });
        }

        // --- ĐOẠN SỬA LỖI MẬT KHẨU TẠI ĐÂY ---
        // 1. Thử kiểm tra xem có phải mật khẩu đã băm (Acc mới tạo)
        let isMatch = await bcrypt.compare(MatKhau, user.MatKhau);

        // 2. Nếu không phải mật khẩu băm, kiểm tra xem có khớp chữ bình thường không (Dành cho admin_vy)
        if (!isMatch && MatKhau === user.MatKhau) {
            isMatch = true; 
        }
        // -------------------------------------

        if (isMatch) {
            // Đăng nhập thành công -> Lưu vào session
            req.session.user = { 
                _id: user._id, 
                HoTen: user.HoTen, 
                QuyenHan: user.QuyenHan 
            };

            // Đợi lưu Session xong mới Redirect
            req.session.save((err) => {
                if (err) return res.send('Lỗi lưu phiên đăng nhập');
                res.redirect('/'); 
            });
        } else {
            return res.render('login', { error: '❌ Sai mật khẩu!', success: null });
        }
    } catch (err) {
        res.render('login', { error: 'Lỗi Server: ' + err.message, success: null });
    }
});

// Đăng ký và Đăng xuất giữ nguyên logic của bạn...
router.get('/dang-xuat', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==========================================
// PHẦN ADMIN: QUẢN LÝ NGƯỜI DÙNG
// ==========================================

// Middleware kiểm tra quyền admin (nếu trong file này chưa có)
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.QuyenHan.toLowerCase() === 'admin') {
        next();
    } else {
        res.status(403).send('Cấm truy cập: Bạn không có quyền quản trị.');
    }
};

// 1. Trang danh sách người dùng
router.get('/admin/quan-ly-nguoi-dung', checkAdmin, async (req, res) => {
    try {
        // Lấy tất cả user (Ngoại trừ tài khoản Admin đang đăng nhập để tránh lỡ tay tự khóa mình)
        const danhSachNguoiDung = await TaiKhoan.find({ _id: { $ne: req.session.user._id } }).sort({ _id: -1 });
        
        res.render('admin/quan-ly-nguoi-dung', { 
            danhSachNguoiDung, 
            user: req.session.user 
        });
    } catch (err) {
        res.status(500).send('Lỗi tải danh sách người dùng: ' + err.message);
    }
});

// 2. Nút Khóa / Mở khóa tài khoản
router.get('/admin/khoa-tai-khoan/:id', checkAdmin, async (req, res) => {
    try {
        const userToUpdate = await TaiKhoan.findById(req.params.id);
        if (userToUpdate) {
            // Đảo ngược trạng thái: Nếu đang 1 (Hoạt động) thì chuyển thành 0 (Khóa), và ngược lại
            userToUpdate.KichHoat = userToUpdate.KichHoat === 1 ? 0 : 1;
            await userToUpdate.save();
        }
        res.redirect('/admin/quan-ly-nguoi-dung');
    } catch (err) {
        res.status(500).send('Lỗi thao tác: ' + err.message);
    }
});

// 3. Nút Xóa tài khoản
router.get('/admin/xoa-tai-khoan/:id', checkAdmin, async (req, res) => {
    try {
        await TaiKhoan.findByIdAndDelete(req.params.id);
        res.redirect('/admin/quan-ly-nguoi-dung');
    } catch (err) {
        res.status(500).send('Lỗi khi xóa: ' + err.message);
    }
});

// Hiển thị trang Hồ sơ cá nhân
router.get('/ho-so', async (req, res) => {
    // Nếu chưa đăng nhập thì đuổi về trang đăng nhập
    if (!req.session.user) return res.redirect('/dang-nhap');
    
    try {
        // Tìm thông tin mới nhất của user từ Database
        const user = await TaiKhoan.findById(req.session.user._id);
        
        res.render('ho-so', { 
            user: user,
            titlePage: 'Hồ Sơ Cá Nhân' 
        });
    } catch (err) {
        res.status(500).send('Lỗi tải hồ sơ: ' + err.message);
    }
});

    // API: Xử lý Đổi mật khẩu
router.post('/api/doi-mat-khau', async (req, res) => {
    if (!req.session.user) return res.json({ success: false, msg: 'Vui lòng đăng nhập lại!' });
    
    try {
        const { matKhauCu, matKhauMoi } = req.body;
        const user = await TaiKhoan.findById(req.session.user._id);

        if (!user) return res.json({ success: false, msg: 'Tài khoản không tồn tại!' });

        // 1. Kiểm tra mật khẩu cũ (Giống logic lúc đăng nhập)
        let isMatch = await bcrypt.compare(matKhauCu, user.MatKhau);
        // Hỗ trợ trường hợp tài khoản cũ có mật khẩu chưa băm
        if (!isMatch && matKhauCu === user.MatKhau) {
            isMatch = true; 
        }

        if (!isMatch) {
            return res.json({ success: false, msg: 'Mật khẩu hiện tại không chính xác!' });
        }

        if (matKhauMoi.length < 6) {
            return res.json({ success: false, msg: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
        }

        // 2. Băm mật khẩu mới cho an toàn rồi lưu vào Database
        const salt = await bcrypt.genSalt(10);
        user.MatKhau = await bcrypt.hash(matKhauMoi, salt);
        await user.save();

        res.json({ success: true, msg: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        res.json({ success: false, msg: 'Lỗi máy chủ: ' + err.message });
    }
});

module.exports = router;