const express = require('express');
const router = express.Router();

// 1. Gọi TẤT CẢ các file route con
const taikhoanRoute = require('./taikhoan');
const baivanRoute = require('./baivan');
const theloaiRoute = require('./theloai');   // Đã mở khóa
const binhluanRoute = require('./binhluan'); // Đã mở khóa


// 2. Gắn kết chúng vào hệ thống
router.use('/', taikhoanRoute);
router.use('/', baivanRoute);
router.use('/', theloaiRoute);   
router.use('/', binhluanRoute);  
router.use('/', require('./homthu'));

module.exports = router;