const mongoose = require('mongoose');

const essaySchema = new mongoose.Schema({
    TieuDe: { type: String, required: true },
    TomTat: { type: String },
    TheLoai_id: { type: mongoose.Schema.Types.ObjectId, ref: 'theloai', required: true },
    TacGia_id: { type: mongoose.Schema.Types.ObjectId, ref: 'taikhoan', required: true },
    DriveFileId: { type: String, required: true },
    WebViewLink: { type: String },
    WebContentLink: { type: String },
    CheDoChiaSe: { type: String, default: 'CongKhai' },
    NgayDang: { type: Date, default: Date.now },
    
    // --- Phần bổ sung mới ---
    LuotXem: { type: Number, default: 0 }, // Tự động tăng khi có người xem
    TrangThai: { 
        type: String, 
        default: 'ChoDuyet', 
        enum: ['ChoDuyet', 'DaDuyet', 'BiTuChoi'] // Chỉ cho phép 1 trong 3 giá trị này
    }
});

module.exports = mongoose.model('baivan', essaySchema);