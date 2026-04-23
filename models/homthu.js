const mongoose = require('mongoose');

const homThuSchema = new mongoose.Schema({
    NoiDung: { type: String, required: true },
    // Tự động tạo tên ẩn danh ngẫu nhiên kiểu "user12345"
    MaAnDanh: { 
        type: String, 
        default: () => 'user' + Math.floor(10000 + Math.random() * 90000) 
    },
    LuotThich: { type: Number, default: 0 },
    NgayGui: { type: Date, default: Date.now },
    TrangThai: { type: String, default: 'DaDuyet' } // Cứ đăng là hiện lên liền, không cần duyệt nữa
});

module.exports = mongoose.model('HomThu', homThuSchema);