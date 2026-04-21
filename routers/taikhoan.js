const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Gọi thư viện băm mật khẩu
const TaiKhoan = require('../models/taikhoan');

// ==========================================
// 1. CHỨC NĂNG ĐĂNG KÝ TÀI KHOẢN
// ==========================================
// Hiển thị trang Đăng ký
router.get('/dang-ky', (req, res) => {
    res.render('register', { error: null }); 
});

// Xử lý nộp form Đăng ký
router.post('/dang-ky', async (req, res) => {
    try {
        const { HoTen, TenDangNhap, MatKhau, XacNhanMatKhau } = req.body;

        // Ràng buộc 1: Kiểm tra mật khẩu khớp nhau
        if (MatKhau !== XacNhanMatKhau) {
            return res.render('register', { error: '❌ Mật khẩu xác nhận không trùng khớp!' });
        }

        // Ràng buộc 2: Kiểm tra độ dài mật khẩu
        if (MatKhau.length < 6) {
            return res.render('register', { error: '❌ Mật khẩu phải có ít nhất 6 ký tự!' });
        }

        // Ràng buộc 3: Kiểm tra tên đăng nhập đã tồn tại chưa
        const userTonTai = await TaiKhoan.findOne({ TenDangNhap: TenDangNhap });
        if (userTonTai) {
            return res.render('register', { error: '❌ Tên đăng nhập đã có người sử dụng. Vui lòng chọn tên khác!' });
        }

        // BƯỚC BĂM MẬT KHẨU (Hashing)
        const salt = await bcrypt.genSalt(10); // Tạo chuỗi ngẫu nhiên (độ khó 10)
        const hashedPassword = await bcrypt.hash(MatKhau, salt); // Trộn và băm

        // Lưu vào Database
        const taiKhoanMoi = new TaiKhoan({
            HoTen: HoTen,
            TenDangNhap: TenDangNhap,
            MatKhau: hashedPassword // CHÚ Ý: Lưu mật khẩu đã băm, KHÔNG lưu mật khẩu gốc
        });

        await taiKhoanMoi.save();
        
        // Chuyển hướng về trang Đăng nhập kèm thông báo thành công
        res.render('login', { error: null, success: '✅ Đăng ký thành công! Hãy đăng nhập.' });

    } catch (err) {
        res.render('register', { error: '❌ Lỗi hệ thống: ' + err.message });
    }
});

// ==========================================
// 2. CHỨC NĂNG ĐĂNG NHẬP
// ==========================================
// Hiển thị trang Đăng nhập
router.get('/dang-nhap', (req, res) => {
    res.render('login', { error: null, success: null }); 
});

// Xử lý nộp form Đăng nhập
router.post('/dang-nhap', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau } = req.body;
        
        // 1. Tìm user trong Database
        const user = await TaiKhoan.findOne({ TenDangNhap: TenDangNhap });
        if (!user) {
            return res.render('login', { error: '❌ Tài khoản không tồn tại!', success: null });
        }

        // 2. Kiểm tra xem tài khoản có bị khóa không
        if (user.KichHoat === 0) {
            return res.render('login', { error: '❌ Tài khoản của bạn đã bị khóa!', success: null });
        }

        // 3. ĐỐI CHIẾU MẬT KHẨU (So sánh mật khẩu nhập vào với mật khẩu đã băm trong DB)
        // LƯU Ý: Vì hàm /setup hồi xưa lưu '123456' trực tiếp, hàm compare này sẽ báo lỗi với acc admin_vy cũ. 
        // Từ giờ bạn phải dùng tài khoản mới tự đăng ký để test nhé!
        const isMatch = await bcrypt.compare(MatKhau, user.MatKhau);
        
        if (!isMatch) {
            // Trường hợp ngoại lệ: Giữ lại cửa lùi cho acc admin_vy test lúc trước chưa băm pass
            if (MatKhau === user.MatKhau) {
                // Cho qua
            } else {
                return res.render('login', { error: '❌ Sai mật khẩu!', success: null });
            }
        }

        // 4. Đăng nhập thành công -> Lưu vào két sắt (Session)
        req.session.user = { 
            _id: user._id, 
            HoTen: user.HoTen, 
            QuyenHan: user.QuyenHan 
        };
        
        res.redirect('/'); 

    } catch (err) {
        res.render('login', { error: '❌ Lỗi Server: ' + err.message, success: null });
    }
});

// ==========================================
// 3. CHỨC NĂNG ĐĂNG XUẤT
// ==========================================
router.get('/dang-xuat', (req, res) => {
    req.session.destroy(); // Hủy két sắt (Xóa session)
    res.redirect('/');
});

module.exports = router;