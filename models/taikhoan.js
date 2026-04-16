const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    HoTen: { type: String, required: true },
    TenDangNhap: { type: String, required: true, unique: true },
    MatKhau: { type: String, required: true },
    QuyenHan: { type: String, default: 'user' },
    KichHoat: { type: Number, default: 1 },

    DanhSachLuu: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'baivan' 
    }]
});
module.exports = mongoose.model('taikhoan', userSchema);