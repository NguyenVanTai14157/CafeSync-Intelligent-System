import { useEffect, useState } from "react";
import { Table, Typography, Tag, Button, message, Input, Tabs, Badge, Modal } from "antd";
import { io } from "socket.io-client";
import axios from "axios";
import API_URL from "../config";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const { Title, Text } = Typography;

const OrderManagementPage = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [busy, setBusy] = useState({});
  const [searchText, setSearchText] = useState("");
  const rqClient = useQueryClient();

  // ⚡ React Query: Cache + auto-polling mỗi 5s
  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/orders`);
      return res.data;
    },
    refetchInterval: 5000, // Tự động refresh mỗi 5 giây (thay cho setInterval cũ)
  });

  useEffect(() => {
    const socket = io(API_URL);
    const merge = (order) => {
      rqClient.setQueryData(['orders'], (old = []) => [order, ...old.filter(o => o._id !== order._id)].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      rqClient.invalidateQueries({ queryKey: ['dashboard'] });
    };
    const reconnect = () => rqClient.invalidateQueries({ queryKey: ['orders'] });
    socket.on('new_order', merge); socket.on('order_updated', merge); socket.on('connect', reconnect);
    return () => socket.disconnect();
  }, [rqClient]);
  const matchesTab = (order, tab) => {
    if (tab === 'all') return true;
    if (tab === 'history') return order.status === 'Hoàn thành' || order.status === 'Đã xong';
    if (order.paymentStatus !== 'paid') return false;
    if (tab === 'waiting') return order.status === 'Chờ pha chế';
    if (tab === 'making') return order.status === 'Đang pha chế';
    return ['Chờ pha chế', 'Đang pha chế'].includes(order.status);
  };
  const tabs = [['active','Đang phục vụ'],['waiting','Chờ pha chế'],['making','Đang làm'],['history','Lịch sử hoàn thành'],['all','Tất cả']];
  const filteredOrders = orders.filter(o => matchesTab(o, activeTab) && (!searchText.trim() || o.orderID?.toLowerCase().includes(searchText.trim().toLowerCase())));
  const advance = async (order) => {
    if (busy[order._id]) return;
    setBusy(old => ({ ...old, [order._id]: true }));
    try {
      const status = order.status === 'Chờ pha chế' ? 'Đang pha chế' : 'Hoàn thành';
      const { data } = await axios.put(API_URL + '/api/orders/' + order._id + '/status', { status }, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      rqClient.setQueryData(['orders'], (old = []) => old.map(o => o._id === data._id ? data : o));
      rqClient.invalidateQueries({ queryKey: ['dashboard'] });
      message.success('Đã cập nhật trạng thái');
    } catch (error) {
      message.error(error.response?.data?.message || 'Cập nhật thất bại');
      rqClient.invalidateQueries({ queryKey: ['orders'] });
    } finally { setBusy(old => ({ ...old, [order._id]: false })); }
  };
  const confirmCash = (order) => Modal.confirm({
    icon: null,
    title: 'Đã thu đủ tiền mặt từ khách?',
    content: `Đơn ${order.orderID} sẽ được gửi xuống quầy pha chế.`,
    okText: 'Đã thu tiền', cancelText: 'Chưa thu',
    onOk: async () => {
      try {
        await axios.post(`${API_URL}/api/orders/${order._id}/confirm-cash`, {}, { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        await rqClient.invalidateQueries({ queryKey: ['orders'] });
      } catch (error) { message.error(error.response?.data?.message || 'Xác nhận thất bại'); throw error; }
    }
  });

  const columns = [
    { 
      title: "Thông tin Đơn hàng", 
      key: "orderInfo",
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#1677ff' }}>#</span>{record.orderID}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {new Date(record.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • {new Date(record.createdAt).toLocaleDateString("vi-VN")}
          </div>
          <div style={{ marginTop: 8 }}>
            {record.tableNumber ? (
              <Tag color="gold" style={{ borderRadius: 6, fontWeight: 600 }}>Bàn {record.tableNumber}</Tag>
            ) : (
              <Tag style={{ borderRadius: 6 }}>{record.location || "Mang về"}</Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong>{text || "Khách vãn lai"}</Text>
        </div>
      )
    },
    {
      title: "Chi tiết Sản phẩm",
      dataIndex: "items",
      key: "items",
      render: (items) => (
        <div style={{ maxWidth: 400 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ 
              padding: '8px 12px', 
              background: '#f8fafc', 
              borderRadius: 8, 
              marginBottom: idx === items.length - 1 ? 0 : 8,
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name} <span style={{ color: '#64748b', fontWeight: 400 }}>x{item.quantity}</span></span>
                <span style={{ color: "#059669", fontWeight: 700, fontSize: 13 }}>{item.price.toLocaleString("vi-VN")}₫</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {item.options?.size && <span><b>Size:</b> {item.options.size}</span>}
                {item.options?.sugar && <span><b>Đường:</b> {item.options.sugar}</span>}
                {item.options?.ice && <span><b>Đá:</b> {item.options.ice}</span>}
                {item.options?.toppings?.length > 0 && <span><b>Topping:</b> {item.options.toppings.join(", ")}</span>}
                {item.note && <span style={{ color: '#dc2626' }}><b>Ghi chú:</b> {item.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Thanh toán",
      key: "payment",
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{record.totalPrice.toLocaleString("vi-VN")} ₫</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>{record.paymentMethod || "Tiền mặt"}</div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const config = {
          "Chờ pha chế": { color: "orange", label: "Chờ pha chế" },
          "Chờ thanh toán": { color: "gold", label: "Chờ thanh toán" },
          "Đang pha chế": { color: "blue", label: "Đang pha chế" },
          "Hoàn thành": { color: "cyan", label: "Hoàn thành" },
          "Đã thanh toán": { color: "green", label: "Đã thanh toán" },
        };
        const c = config[status] || { color: "default", label: status };
        return <Tag color={c.color} style={{ borderRadius: 6, padding: '2px 12px', fontWeight: 600 }}>{c.label.toUpperCase()}</Tag>
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_, order) => order.paymentStatus === 'paid' && ['Chờ pha chế','Đang pha chế'].includes(order.status)
        ? <Button type="primary" loading={busy[order._id]} onClick={() => advance(order)}>{order.status === 'Chờ pha chế' ? 'Bắt đầu làm' : 'Hoàn thành'}</Button>
        : activeTab === 'all' && order.paymentMethod === 'Tiền mặt' && order.paymentStatus !== 'paid' && ['Chờ thanh toán','Chờ xác nhận'].includes(order.status)
          ? <Button onClick={() => confirmCash(order)}>Xác nhận thu tiền</Button>
          : <Text type="secondary">{order.status === 'Hoàn thành' ? 'Đã hoàn thành' : 'Không có thao tác'}</Text>,
    },
  ];

  return (
    <div className="modern-card animated-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Điều phối pha chế</Title>
            <Text type="secondary">Chỉ đơn đã thanh toán được đưa vào hàng đợi pha chế</Text>
          </div>
        </div>
        
        <Input
          placeholder="Tìm theo mã đơn (vd: CS123)..."
          size="large"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 350 }}
          className="search-input-modern"
        />
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs.map(([key,label]) => ({ key, label: <span>{label} <Badge count={orders.filter(o => matchesTab(o,key)).length} showZero /></span> }))} />
      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="_id"
        loading={loading}
        locale={{ emptyText: 'Không có đơn hàng' }}
        pagination={{ 
          pageSize: 10,
          showTotal: (total) => `Tổng cộng ${total} đơn hàng`,
          position: ["bottomRight"]
        }}
        className="modern-table"
      />
      <style>{`
        .animated-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-input-modern .ant-input-affix-wrapper {
          border-radius: 10px !important;
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }
        .search-input-modern .ant-input-affix-wrapper-focused {
          background: #fff !important;
          box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.1) !important;
        }
        .modern-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-weight: 700 !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
        }
      `}</style>


    </div>
  );
};

export default OrderManagementPage;
