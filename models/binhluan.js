const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    NoiDung: { type: String, required: true },
    BaiVan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'baivan', required: true },
    
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'taikhoan', required: true },
    NgayBinhLuan: { type: Date, default: Date.now }
});

module.exports = mongoose.model('binhluan', commentSchema);