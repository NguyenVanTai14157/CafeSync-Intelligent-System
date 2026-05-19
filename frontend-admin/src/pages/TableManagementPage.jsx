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
    <div style={{ padding: '28px 32px', background: '#faf9f7', minHeight: '100vh', fontFamily: 'inherit' }}>
      <style>{`
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
          border-radius: 20px;
          border: 1.5px solid #f0ece4;
          transition: all 0.25s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .table-card:hover {
          border-color: #C8873A;
          transform: translateY(-4px);
          box-shadow: 0 16px 32px -8px rgba(200, 135, 58, 0.15);
        }
        .filter-pill {
          padding: 7px 18px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-pill:hover { border-color: #C8873A; color: #C8873A; }
        .status-select {
          background: transparent;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #3d2b1a;
          outline: none;
          cursor: pointer;
          padding: 0;
          width: 100%;
          appearance: none;
        }
        .icon-btn {
          width: 38px; height: 38px;
          background: #fff;
          border: 1.5px solid #e8e2d8;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #9ca3af;
          font-size: 16px;
          transition: all 0.2s;
        }
        .icon-btn:hover { border-color: #C8873A; color: #C8873A; }
        .print-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px;
          background: #2D1E12;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .print-btn:hover { background: #C8873A; transform: scale(1.02); }
        .stat-card {
          background: #fff;
          border-radius: 14px;
          border: 1.5px solid #f0ece4;
          padding: 16px 20px;
          flex: 1;
          min-width: 0;
        }
        .qr-wrapper {
          background: #faf9f7;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          margin: 0 20px;
          border: 1.5px dashed #e8e2d8;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2D1E12', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#C8873A' }}><CoffeeOutlined /></span>
            Sơ Đồ Bàn & QR Code
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 14, margin: '4px 0 0', fontWeight: 500 }}>Quản lý trạng thái bàn và mã QR đặt món</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="icon-btn" onClick={fetchTables} title="Làm mới">
            <ReloadOutlined />
          </button>
          <button className="print-btn" onClick={handlePrint}>
            <PrinterOutlined /> IN STICKER BÀN
          </button>
        </div>
      </div>

      {/* ── Stat Row ── */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng bàn', value: stats.total, color: '#2D1E12' },
          { label: 'Còn trống', value: stats.empty, color: '#16a34a' },
          { label: 'Đang phục vụ', value: stats.serving, color: '#ea580c' },
          { label: 'Đã đặt trước', value: stats.reserved, color: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Pills ── */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'Trống', label: 'Còn trống' },
          { key: 'Đang phục vụ', label: 'Đang phục vụ' },
          { key: 'Đã đặt trước', label: 'Đã đặt trước' },
        ].map(f => (
          <button
            key={f.key}
            className="filter-pill"
            onClick={() => setFilter(f.key)}
            style={{
              background: filter === f.key ? '#2D1E12' : '#fff',
              color: filter === f.key ? '#fff' : '#6b7280',
              borderColor: filter === f.key ? '#2D1E12' : '#e8e2d8',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table Grid ── */}
      <div
        id="qr-print-root"
        className="print-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 20,
        }}
      >
        {filtered.map(table => {
          const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG['Trống'];
          return (
            <div key={table._id} className="table-card">

              {/* Card Top Bar */}
              <div className="browser-only" style={{
                padding: '16px 20px 14px',
                borderBottom: '1.5px solid #f5f2ec',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#2D1E12' }}>Bàn {table.tableNumber}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 100,
                  background: cfg.badge.bg,
                  color: cfg.badge.text,
                  border: `1px solid ${cfg.badge.border}`,
                  display: 'flex', alignItems: 'center', gap: 4,
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
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: '#C8873A', margin: '0 0 4px', textTransform: 'uppercase' }}>CAFÉ SYNC</p>
                <p style={{ fontSize: 48, fontWeight: 900, color: '#2D1E12', margin: 0, lineHeight: 1 }}>{table.tableNumber}</p>
              </div>

              {/* QR Code */}
              <div className="qr-wrapper" style={{ margin: '18px 18px' }}>
                <QRCodeSVG
                  value={`${clientBaseUrl}/?table=${table.tableNumber}`}
                  size={130}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#2D1E12"
                />
              </div>

              {/* Print Footer */}
              <div className="print-only" style={{
                flexDirection: 'column', alignItems: 'center',
                paddingBottom: 20, gap: 4,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#6b7280', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ScanOutlined /> Quét mã để đặt món
                </p>
              </div>

              {/* Browser Footer – Status Selector */}
              <div className="browser-only" style={{
                padding: '12px 20px',
                borderTop: '1.5px solid #f5f2ec',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 'auto',
              }}>
                <span style={{ color: '#C8873A', fontSize: 14 }}>{cfg.icon}</span>
                <div style={{ flex: 1, position: 'relative' }}>
                  <select
                    value={table.status}
                    onChange={(e) => updateStatus(table.tableNumber, e.target.value)}
                    className="status-select"
                  >
                    <option value="Trống">Còn trống</option>
                    <option value="Đang phục vụ">Đang dùng</option>
                    <option value="Đã đặt trước">Đã đặt trước</option>
                  </select>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#9ca3af', pointerEvents: 'none', flexShrink: 0 }}>
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <CoffeeOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
          <p style={{ fontWeight: 600 }}>Không có bàn nào phù hợp</p>
        </div>
      )}
    </div>
  );
};

export default TableManagementPage;