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

module.exports = router;