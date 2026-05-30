const Table = require('../models/Table');

// Lấy danh sách tất cả các bàn
exports.getAllTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.status(200).json(tables);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo bàn mới
exports.createTable = async (req, res) => {
  try {
    const { tableNumber } = req.body;
    
    // Kiểm tra xem số bàn đã tồn tại chưa
    const exists = await Table.findOne({ tableNumber });
    if (exists) {
      return res.status(400).json({ message: 'Số bàn này đã tồn tại.' });
    }
    
    const newTable = new Table({ tableNumber, status: 'Trống' });
    await newTable.save();
    res.status(201).json(newTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Khởi tạo 50 bàn nếu chưa có
exports.initializeTables = async (req, res) => {
  try {
    const count = await Table.countDocuments();
    if (count < 50) {
      const tablesToCreate = [];
      for (let i = 1; i <= 50; i++) {
        // Only created if not exists
        const exists = await Table.findOne({ tableNumber: i });
        if (!exists) {
          tablesToCreate.push({ tableNumber: i, status: 'Trống' });
        }
      }
      if (tablesToCreate.length > 0) {
        await Table.insertMany(tablesToCreate);
      }
      return res.status(201).json({ message: 'Khởi tạo 50 bàn thành công.' });
    }
    res.status(200).json({ message: 'Danh sách bàn đã được khởi tạo trước đó.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cập nhật trạng thái bàn
exports.updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if id is a valid ObjectId, otherwise treat it as tableNumber
    let query = {};
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = id;
    } else {
      query.tableNumber = parseInt(id, 10);
    }
    
    const updatedTable = await Table.findOneAndUpdate(
      query,
      { status },
      { new: true }
    );
    if (!updatedTable) {
      return res.status(404).json({ message: 'Không tìm thấy bàn' });
    }
    res.status(200).json(updatedTable);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Xoá tất cả bàn (Dùng cho Admin nếu cần reset)
exports.deleteAllTables = async (req, res) => {
    try {
        await Table.deleteMany({});
        res.status(200).json({ message: 'Đã xóa tất cả bàn.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
