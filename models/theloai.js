const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
    TenTheLoai: { type: String, required: true },
    MoTa: { type: String }
});
module.exports = mongoose.model('theloai', categorySchema);