const mongoose = require('mongoose');

const lichSuSchema = new mongoose.Schema({
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'taikhoan', required: true },
    BaiVan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'baivan', required: true },
    NgayXem: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LichSu', lichSuSchema);