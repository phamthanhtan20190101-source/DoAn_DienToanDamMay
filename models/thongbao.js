const mongoose = require('mongoose');

const thongBaoSchema = new mongoose.Schema({
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'taikhoan', required: true }, // Thông báo này gửi cho ai
    TieuDe: { type: String, required: true },
    NoiDung: { type: String, required: true },
    DaDoc: { type: Boolean, default: false }, // Đánh dấu đã đọc hay chưa (để hiện chấm đỏ)
    NgayTao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('thongbao', thongBaoSchema);