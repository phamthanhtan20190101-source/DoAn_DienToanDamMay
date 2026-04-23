const express = require('express');
const router = express.Router();
const BinhLuan = require('../models/binhluan');
const ThongBao = require('../models/thongbao');

// Middleware kiểm tra quyền admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.QuyenHan.toLowerCase() === 'admin') {
        next();
    } else {
        res.status(403).send('Cấm truy cập: Bạn không có quyền quản trị.');
    }
};

// 1. API Thêm bình luận (Dành cho người dùng)
router.post('/api/them-binh-luan', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.json({ success: false, msg: 'Bạn cần đăng nhập để bình luận!' });
        }
        const { BaiVan_id, NoiDung } = req.body;
        if (!NoiDung || NoiDung.trim() === '') {
            return res.json({ success: false, msg: 'Nội dung bình luận không được để trống!' });
        }

        const newBinhLuan = new BinhLuan({
            BaiVan_id: BaiVan_id,
            TaiKhoan_id: req.session.user._id, // Lưu ID người đăng
            NoiDung: NoiDung.trim()
        });
        await newBinhLuan.save();

        res.json({ 
            success: true, 
            HoTen: req.session.user.HoTen, 
            NoiDung: newBinhLuan.NoiDung,
            NgayBinhLuan: newBinhLuan.NgayBinhLuan
        });
    } catch (err) {
        res.json({ success: false, msg: 'Lỗi Server: ' + err.message });
    }
});

// ==========================================
// PHẦN ADMIN: QUẢN LÝ BÌNH LUẬN
// ==========================================

// 2. Trang Quản lý Bình Luận (Hiển thị danh sách cho Admin)
router.get('/admin/quan-ly-binh-luan', checkAdmin, async (req, res) => {
    try {
        const danhSachBinhLuan = await BinhLuan.find()
            .populate('TaiKhoan_id', 'HoTen') // Lấy tên người bình luận
            .populate('BaiVan_id', 'TieuDe')  // Lấy tiêu đề bài văn
            .sort({ NgayBinhLuan: -1 });      // Mới nhất lên đầu
        
        res.render('admin/quan-ly-binh-luan', { 
            danhSachBinhLuan, 
            user: req.session.user 
        });
    } catch (err) {
        res.status(500).send('Lỗi tải danh sách bình luận: ' + err.message);
    }
});

// 3. Nút Xóa bình luận (Admin xóa và gửi thông báo về cho người dùng)
router.get('/admin/xoa-binh-luan/:id', checkAdmin, async (req, res) => {
    try {
        // Tìm bình luận trước để lấy thông tin người dùng (TaiKhoan_id) và bài viết (BaiVan_id)
        const bl = await BinhLuan.findById(req.params.id).populate('BaiVan_id');
        
        if (bl) {
            // Bước A: Tạo thông báo gửi cho chính người có bình luận bị xóa (bl.TaiKhoan_id)
            const newTB = new ThongBao({
                TaiKhoan_id: bl.TaiKhoan_id, 
                TieuDe: 'Cảnh báo vi phạm',
                NoiDung: `Bình luận của bạn trong bài viết "${bl.BaiVan_id ? bl.BaiVan_id.TieuDe : 'một tác phẩm'}" đã bị Admin xóa do vi phạm tiêu chuẩn cộng đồng.`
            });
            await newTB.save();

            // Bước B: Tiến hành xóa bình luận khỏi cơ sở dữ liệu
            await BinhLuan.findByIdAndDelete(req.params.id);
        }
        
        res.redirect('/admin/quan-ly-binh-luan');
    } catch (err) {
        res.status(500).send('Lỗi khi thao tác: ' + err.message);
    }
});

router.post('/api/doc-thong-bao', async (req, res) => {
    try {
        if (!req.session.user) return res.json({ success: false });
        // Cập nhật trạng thái thông báo của user này trong Database
        await ThongBao.updateMany(
            { TaiKhoan_id: req.session.user._id, DaDoc: false },
            { $set: { DaDoc: true } }
        );
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

module.exports = router;