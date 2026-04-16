const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    NoiDung: { type: String, required: true },
    BaiVan_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'baivan', // Liên kết đến bài văn nào
        required: true 
    },
    NguoiDung_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'taikhoan', // Ai là người bình luận
        required: true 
    },
    NgayBinhLuan: { type: Date, default: Date.now }
});

module.exports = mongoose.model('binhluan', commentSchema);