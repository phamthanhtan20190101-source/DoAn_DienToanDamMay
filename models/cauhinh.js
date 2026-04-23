const mongoose = require('mongoose');

const cauHinhSchema = new mongoose.Schema({
    TenTram: { type: String, default: 'Trạm Văn' },
    GioiThieu: { type: String, default: 'Nơi kết nối những tâm hồn yêu văn chương.' },
    DiaChi: { type: String, default: 'Long Xuyên, An Giang' },
    Email: { type: String, default: 'lienhe@tramvan.vn' },
    SoDienThoai: { type: String, default: '0123 456 789' },
    Facebook: { type: String, default: '#' },
    Instagram: { type: String, default: '#' },
    Copyright: { type: String, default: '© 2026 Trạm Văn - Vũ Thị Yến Vy' }
});

module.exports = mongoose.model('CauHinh', cauHinhSchema);