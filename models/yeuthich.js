const mongoose = require('mongoose');

const yeuThichSchema = new mongoose.Schema({
    
    TaiKhoan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'taikhoan', required: true },
    BaiVan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'baivan', required: true }
}, { timestamps: true });

module.exports = mongoose.model('YeuThich', yeuThichSchema);