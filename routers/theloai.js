const express = require('express');
const router = express.Router();
const TheLoai = require('../models/theloai');

// Middleware kiểm tra quyền admin nhanh
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.QuyenHan === 'admin') return next();
    res.status(403).send('Cấm truy cập! Bạn không phải Admin hoặc đã hết phiên đăng nhập.');
};

// 1. Hiển thị giao diện Quản lý Thể loại
router.get('/admin/them-the-loai', isAdmin, async (req, res) => {
    try {
        const danhSachTheLoai = await TheLoai.find().sort({ _id: -1 });
        res.render('admin/them-the-loai', { danhSachTheLoai, error: null });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 2. Xử lý Thêm Thể loại
router.post('/admin/them-the-loai', isAdmin, async (req, res) => {
    try {
        const { TenTheLoai, MoTa } = req.body;
        const check = await TheLoai.findOne({ TenTheLoai });
        if (check) {
            const danhSachTheLoai = await TheLoai.find().sort({ _id: -1 });
            return res.render('admin/them-the-loai', { danhSachTheLoai, error: 'Thể loại đã tồn tại!' });
        }
        await new TheLoai({ TenTheLoai, MoTa }).save();
        res.redirect('/admin/them-the-loai');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// 3. Xử lý Xóa Thể loại
router.get('/admin/xoa-the-loai/:id', isAdmin, async (req, res) => {
    try {
        await TheLoai.findByIdAndDelete(req.params.id);
        res.redirect('/admin/them-the-loai');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;