const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    TieuDe: { 
        type: String, 
        required: true 
    },
    HinhAnh: { 
        type: String, // Lưu đường dẫn ảnh (hoặc link Google Drive)
        required: true 
    },
    DuongDan: { 
        type: String, // Link khi người dùng click vào banner
        default: '#' 
    },
    TrangThai: { 
        type: Boolean, // true = Hiện, false = Ẩn
        default: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);