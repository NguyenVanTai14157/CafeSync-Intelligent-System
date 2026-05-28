import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import API_URL from '../config';
import {
  PrinterOutlined,
  ReloadOutlined,
  CoffeeOutlined,
  ScanOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CalendarFilled,
} from '@ant-design/icons';
import { io } from "socket.io-client";
import { notification } from "antd";

const socket = io(API_URL);

const STATUS_CONFIG = {
  'Trống': {
    label: 'Còn trống',
    icon: <CheckCircleFilled />,
    dot: '#22c55e',
    badge: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  },
  'Đang phục vụ': {
    label: 'Đang dùng',
    icon: <ClockCircleFilled />,
    dot: '#f97316',
    badge: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  },
  'Đã đặt trước': {
    label: 'Đã đặt',
    icon: <CalendarFilled />,
    dot: '#3b82f6',
    badge: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  },
};

const TableManagementPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const clientBaseUrl = 'https://cafe-sync-intelligent-system.vercel.app';

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/tables`);
      setTables(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (tableNumber, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/tables/${tableNumber}/status`, { status: newStatus });
      setTables(prev =>
        prev.map(t => t.tableNumber === tableNumber ? { ...t, status: newStatus } : t)
      );
    } catch (err) {
      console.error('Lỗi cập nhật:', err);
    }
  };

  useEffect(() => { 
    fetchTables(); 

    // Lắng nghe sự kiện cập nhật bàn từ server (Socket.io)
    socket.on("table_updated", (updatedTable) => {
      console.log("📥 Nhận được cập nhật bàn:", updatedTable);
      
      // Hiển thị thông báo nhỏ để Admin biết
      notification.info({
        message: 'Cập nhật trạng thái bàn',
        description: `Bàn số ${updatedTable.tableNumber} đã chuyển sang trạng thái: ${updatedTable.status}`,
        placement: 'bottomRight',
        duration: 3
      });

      setTables(prev => 
        prev.map(t => String(t.tableNumber) === String(updatedTable.tableNumber) ? updatedTable : t)
      );
    });

    return () => {
      socket.off("table_updated");
    };
  }, []);

  const handlePrint = () => {
    const grid = document.getElementById('qr-print-root');
    if (!grid) { window.print(); return; }

    const placeholder = document.createElement('div');
    placeholder.id = '__qr_placeholder__';
    grid.parentNode.insertBefore(placeholder, grid);
    document.body.appendChild(grid);

    const style = document.createElement('style');
    style.id = '__print_override__';
    style.innerHTML = `
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body > *:not(#qr-print-root) { display: none !important; }
        #qr-print-root {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 6mm !important;
          padding: 8mm !important;
          width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }
        .table-card {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          border: 1.5px dashed #bbb !important;
          box-shadow: none !important;
          border-radius: 12px !important;
          background: #fff !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .qr-wrapper {
          background: #fff !important;
          border: 1.5px dashed #ddd !important;
          margin: 10px 14px !important;
          padding: 14px !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        .browser-only { display: none !important; }
        .print-only { display: flex !important; }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      placeholder.parentNode.insertBefore(grid, placeholder);
      placeholder.remove();
      const el = document.getElementById('__print_override__');
      if (el) el.remove();
    }, 1500);
  };

  const filtered = filter === 'all' ? tables : tables.filter(t => t.status === filter);

  const stats = {
    total: tables.length,
    empty: tables.filter(t => t.status === 'Trống').length,
    serving: tables.filter(t => t.status === 'Đang phục vụ').length,
    reserved: tables.filter(t => t.status === 'Đã đặt trước').length,
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
      <div style={{
        width: 48, height: 48, border: '3px solid #f3f0ea',
        borderTopColor: '#C8873A', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500 }}>Đang tải sơ đồ bàn...</p>
    </div>
  );

  return (
    <div style={{ padding: '24px 32px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-fade-in { animation: fadeIn 0.5s ease-out; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          body, html { margin: 0; padding: 0; }
          header, aside, nav,
          .ant-layout-sider, .ant-layout-header,
          [class*="sider"], [class*="sidebar"], [class*="header"],
          [class*="Sider"], [class*="Header"], [class*="Layout"] > *:not([class*="Content"]) { display: none !important; }
          .ant-layout, .ant-layout-content, main, [class*="Content"] { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 5mm !important;
            padding: 5mm !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .table-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1.5px dashed #bbb !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            background: #fff !important;
          }
          .qr-wrapper {
            margin: 10px 14px !important;
            padding: 14px !important;
            border: 1.5px dashed #ddd !important;
            background: #fff !important;
          }
          .qr-wrapper svg { display: block !important; width: 130px !important; height: 130px !important; }
          .browser-only { display: none !important; }
          .print-only { display: flex !important; }
        }
        .print-only { display: none; }
        .table-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .table-card:hover {
          border-color: #1677ff;
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(22, 119, 255, 0.1);
        }
        .filter-pill {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          background: #fff;
          color: #64748b;
        }
        .filter-pill:hover { border-color: #1677ff; color: #1677ff; }
        .filter-pill.active { background: #1677ff; color: #fff; border-color: #1677ff; box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2); }
        .status-select {
          background: transparent;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          cursor: pointer;
          padding: 0;
          width: 100%;
          appearance: none;
        }
        .icon-btn {
          width: 40px; height: 40px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #64748b;
          font-size: 18px;
          transition: all 0.2s;
        }
        .icon-btn:hover { border-color: #1677ff; color: #1677ff; background: rgba(22, 119, 255, 0.05); }
        .print-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 24px;
          background: #1e293b;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(30, 41, 59, 0.2);
        }
        .print-btn:hover { background: #000; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(30, 41, 59, 0.3); }
        .stat-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          padding: 18px;
          flex: 1;
          min-width: 140px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .qr-wrapper {
          background: #f8fafc;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          margin: 0 20px;
          border: 1px dashed #e2e8f0;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print animated-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: "0 4px 12px rgba(22, 119, 255, 0.2)",
            color: '#fff'
          }}><ScanOutlined /></div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Sơ đồ bàn & QR Code</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: '2px 0 0', fontWeight: 500 }}>Quản lý chỗ ngồi và mã định danh bàn thông minh</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="icon-btn" onClick={fetchTables} title="Làm mới">
            <ReloadOutlined />
          </button>
          <button className="print-btn" onClick={handlePrint}>
            <PrinterOutlined style={{ fontSize: 18 }} /> IN MÃ QR CỦA TẤT CẢ BÀN
          </button>
        </div>
      </div>

      {/* ── Stat Row ── */}
      <div className="no-print animated-fade-in" style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng số bàn', value: stats.total, color: '#1e293b', icon: <CoffeeOutlined /> },
          { label: 'Bàn trống', value: stats.empty, color: '#10b981', icon: <CheckCircleFilled /> },
          { label: 'Đang dùng', value: stats.serving, color: '#f59e0b', icon: <ClockCircleFilled /> },
          { label: 'Đặt trước', value: stats.reserved, color: '#3b82f6', icon: <CalendarFilled /> },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              <span style={{ color: s.color, fontSize: 16, opacity: 0.8 }}>{s.icon}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Pills ── */}
      <div className="no-print animated-fade-in" style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả trạng thái' },
          { key: 'Trống', label: 'Bàn trống' },
          { key: 'Đang phục vụ', label: 'Đang dùng' },
          { key: 'Đã đặt trước', label: 'Đặt trước' },
        ].map(f => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table Grid ── */}
      <div
        id="qr-print-root"
        className="print-grid animated-fade-in"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 24,
        }}
      >
        {filtered.map(table => {
          const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG['Trống'];
          return (
            <div key={table._id} className="table-card">

              {/* Card Top Bar */}
              <div className="browser-only" style={{
                padding: '18px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Bàn {table.tableNumber}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 100,
                  background: cfg.badge.bg,
                  color: cfg.badge.text,
                  border: `1px solid ${cfg.badge.border}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                  {cfg.label}
                </span>
              </div>

              {/* Print Header */}
              <div className="print-only" style={{
                flexDirection: 'column', alignItems: 'center',
                paddingTop: 20, paddingBottom: 8,
              }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#1677ff', margin: '0 0 4px', textTransform: 'uppercase' }}>CAFÉ SYNC</p>
                <p style={{ fontSize: 48, fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1 }}>{table.tableNumber}</p>
              </div>

              {/* QR Code */}
              <div className="qr-wrapper" style={{ margin: '24px 20px' }}>
                <QRCodeSVG
                  value={`${clientBaseUrl}/?table=${table.tableNumber}`}
                  size={140}
                  level="H"
                  includeMargin={false}
                  bgColor="#f8fafc"
                  fgColor="#1e293b"
                />
              </div>

              {/* Print Footer */}
              <div className="print-only" style={{
                flexDirection: 'column', alignItems: 'center',
                paddingBottom: 20, gap: 4,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#64748b', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ScanOutlined /> Quét mã để gọi món
                </p>
              </div>

              {/* Browser Footer – Status Selector */}
              <div className="browser-only" style={{
                padding: '14px 20px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginTop: 'auto',
              }}>
                <span style={{ color: cfg.dot, fontSize: 16 }}>{cfg.icon}</span>
                <div style={{ flex: 1, position: 'relative' }}>
                  <select
                    value={table.status}
                    onChange={(e) => updateStatus(table.tableNumber, e.target.value)}
                    className="status-select"
                  >
                    <option value="Trống">Còn trống</option>
                    <option value="Đang phục vụ">Đang dùng</option>
                    <option value="Đã đặt trước">Đặt trước</option>
                  </select>
                </div>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ color: '#94a3b8', pointerEvents: 'none', flexShrink: 0 }}>
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }} className="animated-fade-in">
          <CoffeeOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block', opacity: 0.5, margin: '0 auto' }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>Không tìm thấy bàn nào phù hợp</p>
          <button onClick={() => setFilter('all')} style={{ color: '#1677ff', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>Xem tất cả bàn</button>
        </div>
      )}
    </div>
  );
};

export default TableManagementPage;