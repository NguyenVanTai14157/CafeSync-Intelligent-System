const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        // Fix lỗi font tiếng Việt từ Buffer của Multer
        const originalNameUtf8 = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        const ext = path.extname(originalNameUtf8);
        const baseName = path.basename(originalNameUtf8, ext);
        
        // Hàm xóa dấu tiếng Việt và ký tự đặc biệt
        const cleanName = baseName
            .normalize('NFD') // Tách dấu
            .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/\s+/g, '-') // Thay khoảng trắng bằng gạch ngang
            .replace(/[^\w-]/g, ''); // Xóa ký tự lạ khác
            
        cb(null, `${cleanName}-${Date.now()}${ext}`);
    }
});

const upload = multer({ storage });

module.exports = upload;