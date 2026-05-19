import { useEffect, useState } from "react";
import { Table, Typography, Tag, Button, Modal, Select, message, Popconfirm, Input } from "antd";
import axios from "axios";
import API_URL from "../config";

const { Title } = Typography;

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  const filteredOrders = orders.filter((order) => {
    if (!searchText) return true;
    return order.orderID && order.orderID.toLowerCase().includes(searchText.toLowerCase().trim());
  });

  // Load orders
  const fetchOrders = (silent = false) => {
    if (!silent) setLoading(true);
    axios.get(`${API_URL}/api/orders`)
      .then(res => setOrders(res.data))
      .catch(() => { if (!silent) setOrders([]); })
      .finally(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    fetchOrders(); // load lần đầu

    // Thiết lập Polling fetch ngầm mỗi 5 giây
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
      fetchOrders();
    } catch {
      message.error("Cập nhật thất bại!");
    }
  };

  // Delete order
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/orders/${id}`);
      message.success("Xóa đơn hàng thành công!");
      fetchOrders();
    } catch {
      message.error("Xóa thất bại!");
    }
  };

  const columns = [
    { title: "Mã đơn", dataIndex: "orderID", key: "orderID" },
    { 
      title: "Vị trí", 
      dataIndex: "location", 
      key: "location",
      render: (text, record) => (
        record.tableNumber ? <Tag color="gold">Bàn {record.tableNumber}</Tag> : <span>{text}</span>
      )
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customerName",
      render: (text) => <b>{text || "Khách vãn lai"}</b>
    },
    {
      title: "Sản phẩm",
      dataIndex: "items",
      key: "items",
      render: (items) => (
        <ul style={{ paddingLeft: 16, margin: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 12, listStyle: "disc" }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {item.name} <span style={{ fontWeight: 400 }}>x{item.quantity}</span>
                <span style={{ color: "#16a34a", marginLeft: 8 }}>
                  ({item.price.toLocaleString("vi-VN")}đ)
                </span>
              </div>
              <div style={{ color: "#555", fontSize: 13, marginLeft: 8, lineHeight: 1.7 }}>
                {item.options?.size && <span><b>Size:</b> {item.options.size} &nbsp; </span>}
                {item.options?.sugar && <span><b>Đường:</b> {item.options.sugar} &nbsp; </span>}
                {item.options?.ice && <span><b>Đá:</b> {item.options.ice} &nbsp; </span>}
                {item.options?.toppings && item.options.toppings.length > 0 && (
                  <span>
                    <b>Topping:</b> {item.options.toppings.join(", ")} &nbsp;
                  </span>
                )}
                {item.note && (
                  <span>
                    <b>Ghi chú:</b> {item.note}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => {
        const d = new Date(v);
        return (
          <span>
            {d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}{" "}
            {d.toLocaleDateString("vi-VN")}
          </span>
        );
      }
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (v) => <b style={{ color: "#16a34a" }}>{v.toLocaleString("vi-VN")} VND</b>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={statusColors[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button size="small" onClick={() => openStatusModal(record)}>
            Đổi trạng thái
          </Button>
          <Popconfirm
            title="Bạn chắc chắn muốn xóa đơn này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </div>
      ),
    },
    
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>🧾 Quản lý Đơn hàng</Title>
        <Input.Search
          placeholder="Tìm kiếm theo mã đơn..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      <Modal
        open={!!editingOrder}
        title="Cập nhật trạng thái đơn hàng"
        onCancel={() => setEditingOrder(null)}
        onOk={handleUpdateStatus}
        okText="Cập nhật"
      >
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: "100%" }}
          options={statusOptions}
        />
      </Modal>
    </div>
  );
};

export default OrderManagementPage;