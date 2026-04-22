const mongoose = require('mongoose');

const yeuThichSchema = new mongoose.Schema({
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan', required: true },
    BaiVan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BaiVan', required: true }
}, { timestamps: true });

module.exports = mongoose.model('YeuThich', yeuThichSchema);