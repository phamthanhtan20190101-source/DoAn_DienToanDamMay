const express = require('express');
const router = express.Router();
const HomThu = require('../models/homthu');

// 1. Tải giao diện Hòm Thư (Kèm danh sách các bài tâm sự)
router.get('/hom-thu', async (req, res) => {
    try {
        const danhSachThu = await HomThu.find({ TrangThai: 'DaDuyet' })
            .sort({ NgayGui: -1 }); // Mới nhất xếp trên cùng

        res.render('hom-thu', { 
            danhSachThu, 
            user: req.session.user,
            titlePage: 'Hòm Thư Tâm Sự' 
        });
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// 2. Xử lý khi bấm nút "Gửi"
router.post('/hom-thu', async (req, res) => {
    try {
        const { NoiDung } = req.body;
        if (!NoiDung || NoiDung.trim() === '') {
            return res.redirect('/hom-thu');
        }

        const thuMoi = new HomThu({ NoiDung: NoiDung.trim() });
        await thuMoi.save();

        res.redirect('/hom-thu'); // Đăng xong thì load lại trang để thấy bài luôn
    } catch (err) {
        res.status(500).send('Lỗi: ' + err.message);
    }
});

module.exports = router;