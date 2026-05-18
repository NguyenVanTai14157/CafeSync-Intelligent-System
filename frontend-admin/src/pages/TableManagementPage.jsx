import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const TableManagementPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cho phép cấu hình URL điện thoại vì localhost không quét được từ máy khác
  const [clientBaseUrl, setClientBaseUrl] = useState(() => {
     return localStorage.getItem('clientBaseUrl') || `http://${window.location.hostname === 'localhost' ? '192.168.x.x' : window.location.hostname}:3001`;
  });

  const handleBaseUrlChange = (e) => {
      setClientBaseUrl(e.target.value);
      localStorage.setItem('clientBaseUrl', e.target.value);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/tables');
      setTables(res.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  const initializeTables = async () => {
    try {
      await axios.post('http://localhost:5000/api/tables/initialize');
      fetchTables();
      alert('Đã khởi tạo 50 bàn thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const updateStatus = async (tableNumber, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/tables/${tableNumber}/status`, { status: newStatus });
      fetchTables();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu bàn...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D9A05B] to-[#b37731]">
            Quản Lý Bàn & QRCode
          </h1>
          <p className="text-gray-500 mt-2">Theo dõi và in mã QR gọi món tại bàn</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col">
             <label className="text-xs font-bold text-gray-500 mb-1">Tên miền trang Khách Hàng (Dùng để tạo QR)</label>
             <input 
               type="text" 
               value={clientBaseUrl} 
               onChange={handleBaseUrlChange} 
               className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-[250px]"
               placeholder="Vd: http://192.168.1.5:3001"
             />
          </div>

          {tables.length === 0 && (
            <button 
              onClick={initializeTables}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all font-semibold mt-5"
            >
              Khởi tạo 50 Bàn
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tables.map(table => (
          <div key={table._id} className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-gray-800">Bàn {table.tableNumber}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                table.status === 'Trống' ? 'bg-emerald-100 text-emerald-700' :
                table.status === 'Đang phục vụ' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {table.status}
              </span>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-4">
              <QRCodeSVG 
                value={`${clientBaseUrl}/?table=${table.tableNumber}`} 
                size={120} 
                level={"M"}
              />
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center break-all w-full truncate cursor-pointer" title={`${clientBaseUrl}/?table=${table.tableNumber}`}>
              /?table={table.tableNumber}
            </p>

            <select 
              value={table.status} 
              onChange={(e) => updateStatus(table.tableNumber, e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#D9A05B] focus:border-[#D9A05B] block p-2"
            >
              <option value="Trống">Trống</option>
              <option value="Đang phục vụ">Đang phục vụ</option>
              <option value="Đã đặt trước">Đã đặt trước</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableManagementPage;
