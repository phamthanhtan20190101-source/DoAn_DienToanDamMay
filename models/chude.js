const mongoose = require('mongoose');

const chuDeSchema = new mongoose.Schema({
    TenChuDe: { 
        type: String, 
        required: true,
        trim: true 
    },
    MoTa: { 
        type: String, 
        default: '' 
    }
}, { timestamps: true }); // Tự động thêm ngày tạo/cập nhật

module.exports = mongoose.model('ChuDe', chuDeSchema);