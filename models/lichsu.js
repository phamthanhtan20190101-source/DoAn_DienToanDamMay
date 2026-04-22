const mongoose = require('mongoose');

const lichSuSchema = new mongoose.Schema({
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan', required: true },
    BaiVan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BaiVan', required: true },
    NgayXem: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LichSu', lichSuSchema);