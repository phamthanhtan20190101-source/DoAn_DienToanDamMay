const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

// Sau này chúng ta sẽ dán chuỗi kết nối MongoDB vào đây
// mongoose.connect('chuoi_ket_noi_atlas')...

app.get('/', (req, res) => {
    res.send('Server hệ thống Quản lý Bài văn đã chạy thành công!');
});

app.listen(port, () => {
    console.log(`Server đang khởi chạy tại http://localhost:${port}`);
});