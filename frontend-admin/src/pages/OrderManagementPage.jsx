import { useState } from "react";
import { Table, Typography, Tag, Button, Modal, Select, message, Popconfirm, Input } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import API_URL from "../config";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const { Title, Text } = Typography;

const statusColors = {
  "Chờ xác nhận": "orange",
  "Đang pha chế": "blue",
  "Hoàn thành": "cyan",
  "Đã thanh toán": "green",
};

const statusOptions = [
  { value: "Chờ xác nhận", label: "Chờ xác nhận" },
  { value: "Đang pha chế", label: "Đang pha chế" },
  { value: "Hoàn thành", label: "Hoàn thành" },
  { value: "Đã thanh toán", label: "Đã thanh toán" },
];

const OrderManagementPage = () => {
  const [editingOrder, setEditingOrder] = useState(null);
  const [status, setStatus] = useState("");
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

  const filteredOrders = orders.filter((order) => {
    if (!searchText) return true;
    return order.orderID && order.orderID.toLowerCase().includes(searchText.toLowerCase().trim());
  });

  // Open modal to update status
  const openStatusModal = (order) => {
    setEditingOrder(order);
    setStatus(order.status);
  };

  // Update order status
  const handleUpdateStatus = async () => {
    try {
      await axios.put(`${API_URL}/api/orders/${editingOrder._id}/status`, { status });
      message.success("Cập nhật trạng thái thành công!");
      setEditingOrder(null);
      rqClient.invalidateQueries({ queryKey: ["orders"] });
      rqClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      message.error("Cập nhật thất bại!");
    }
  };

  // Delete order
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/orders/${id}`);
      message.success("Xóa đơn hàng thành công!");
      rqClient.invalidateQueries({ queryKey: ["orders"] });
      rqClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch {
      message.error("Xóa thất bại!");
    }
  };

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
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
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
          "Chờ xác nhận": { color: "orange", label: "Chờ xác nhận" },
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
      width: 140,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 10 }}>
          <Button 
            type="primary"
            ghost
            onClick={() => openStatusModal(record)}
            icon={<EditOutlined />}
            style={{ borderRadius: 8 }}
            disabled={(record.paymentMethod !== "Tiền mặt") && (record.status === "Hoàn thành" || record.status === "Đã thanh toán")}
          />
          <Popconfirm
            title="Xóa đơn hàng"
            description="Bạn có chắc chắn muốn xóa đơn hàng này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="modern-card animated-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #1677ff 0%, #722ed1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: "0 4px 12px rgba(114, 46, 209, 0.2)",
            color: '#fff'
          }}>🧾</div>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Danh sách Đơn hàng</Title>
            <Text type="secondary">Theo dõi và cập nhật trạng thái phục vụ khách hàng</Text>
          </div>
        </div>
        
        <Input.Search
          placeholder="Tìm theo mã đơn (vd: CS123)..."
          allowClear
          size="large"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 350 }}
          className="search-input-modern"
        />
      </div>

      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="_id"
        loading={loading}
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

      <Modal
        open={!!editingOrder}
        title="Cập nhật trạng thái đơn hàng"
        onCancel={() => setEditingOrder(null)}
        onOk={handleUpdateStatus}
        okText="Cập nhật"
      >
        {editingOrder?.status === "Đã thanh toán" && (
          <div style={{ marginBottom: 16, color: "#16a34a", fontWeight: "bold" }}>
            ✓ Đơn hàng này đã được thanh toán trực tuyến.
          </div>
        )}
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: "100%" }}
          options={
            editingOrder?.status === "Đã thanh toán"
              ? statusOptions.filter(opt => opt.value === "Đã thanh toán" || opt.value === "Hoàn thành")
              : statusOptions
          }
        />
      </Modal>
    </div>
  );
};

export default OrderManagementPage;