import { useEffect, useState } from "react";
import { Typography, Row, Col, Card, Statistic, Table, Tag, Empty, Spin, Button, Space, notification } from "antd";
import { 
  DollarOutlined, 
  ShoppingCartOutlined, 
  ClockCircleOutlined, 
  WarningOutlined,
  UserOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { io } from "socket.io-client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

import API_URL from "../config";

const { Title, Text } = Typography;

const socket = io(API_URL);

const WelcomePage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [activeFilter, setActiveFilter] = useState("recent");
  
  // States cho Quản trị
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("all");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      if (user?.role === 'admin') {
        const [statsRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/stats/count`),
          axios.get(`${API_URL}/api/users`)
        ]);
        setStats({ userStats: statsRes.data });
        setAllUsers(usersRes.data);
        setFilteredUsers(usersRes.data);
      } else {
        const [statsRes, ordersRes, chartRes] = await Promise.all([
          axios.get(`${API_URL}/api/reports/stats`),
          axios.get(`${API_URL}/api/orders`),
          axios.get(`${API_URL}/api/reports/chart/week`)
        ]);
        setStats(statsRes.data);
        setAllOrders(ordersRes.data);
        const filtered = applyFilterLogic(ordersRes.data, activeFilter);
        setFilteredOrders(filtered);
        setChartData(chartRes.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilterLogic = (data, filterType) => {
    if (filterType === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      return data.filter(o => new Date(o.createdAt).toISOString().split("T")[0] === todayStr);
    } else if (filterType === "pending") {
      return data.filter(o => o.status === "Chờ xác nhận");
    }
    return data.slice(0, 8);
  };

  useEffect(() => {
    fetchData();

    socket.on("new_order", (newOrder) => {
      fetchData();
      notification.success({
        message: "Đơn hàng mới!",
        description: `Mã đơn: ${newOrder.orderID} vừa được tạo.`,
        placement: "bottomRight"
      });
    });

    return () => {
      socket.off("new_order");
    };
  }, [activeFilter]);

  const applyFilter = (filterType) => {
    setActiveFilter(filterType);
    const filtered = applyFilterLogic(allOrders, filterType);
    setFilteredOrders(filtered);
  };

  const applyUserFilter = (roleType) => {
    setUserFilter(roleType);
    if (roleType === "all") {
      setFilteredUsers(allUsers);
    } else {
      setFilteredUsers(allUsers.filter(u => u.role === roleType));
    }
  };

  const lineData = {
    labels: chartData ? chartData.map(d => d.date.split("-").slice(1).reverse().join("/")) : [],
    datasets: [
      {
        label: "Doanh thu",
        data: chartData ? chartData.map(d => d.revenue) : [],
        fill: true,
        borderColor: "#1677ff",
        backgroundColor: "rgba(22, 119, 255, 0.1)",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#1677ff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.parsed.y.toLocaleString()}đ`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { display: false }, ticks: { display: false } },
      x: { grid: { display: false } }
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "100px" }}><Spin size="large" /></div>;

  const orderColumns = [
    { title: "Mã đơn", dataIndex: "orderID", key: "orderID", render: (id) => <Text code>{id}</Text> },
    { title: "Vị trí", dataIndex: "location", key: "location" },
    { title: "Tổng tiền", dataIndex: "totalPrice", key: "totalPrice", render: (v) => <Text strong style={{ color: "#16a34a" }}>{v.toLocaleString()}đ</Text> },
    { 
      title: "Trạng thái", 
      dataIndex: "status", 
      key: "status",
      render: (status) => {
        let color = status === "Chờ xác nhận" ? "orange" : (status === "Hoàn thành" || status === "Đã thanh toán" ? "success" : "blue");
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: "Thao tác", key: "action", render: () => <Button type="link" onClick={() => navigate("/orders")}>Chi tiết</Button> }
  ];

  const userColumns = [
    { title: "Tên", dataIndex: "name", key: "name", render: (text) => <Text strong>{text}</Text> },
    { title: "Email", dataIndex: "email", key: "email" },
    { 
      title: "Vai trò", 
      dataIndex: "role", 
      key: "role",
      render: (r) => {
        const labels = { 
          'admin': ['Quản trị', 'blue'], 
          'manager': ['Quản lý', 'orange'], 
          'quanly': ['Quản lý', 'orange'], 
          'nhanvien': ['Nhân viên', 'green'],
          'customer': ['Khách hàng', 'purple'] 
        };
        const [text, color] = labels[r] || [r, 'default'];
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt", render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div><Title level={2} style={{ marginBottom: 4 }}>Tổng quan hệ thống</Title><Text type="secondary">Chào mừng trở lại, <b>{user.name}</b>!</Text></div>
        {activeFilter !== "recent" && <Button onClick={() => applyFilter("recent")}>Xem đơn gần đây</Button>}
      </div>

      {user?.role === 'admin' ? (
        // DASHBOARD CHO QUẢN TRỊ
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={4}>
            <Card 
              hoverable 
              onClick={() => applyUserFilter("all")}
              style={{ borderRadius: 12, borderTop: "4px solid #1677ff", background: userFilter === "all" ? "#f0f5ff" : "#fff" }}
            >
              <Statistic title="Tổng tài khoản" value={stats?.userStats?.total || 0} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card 
              hoverable 
              onClick={() => applyUserFilter("admin")}
              style={{ borderRadius: 12, borderTop: "4px solid #52c41a", background: userFilter === "admin" ? "#f6ffed" : "#fff" }}
            >
              <Statistic title="Quản trị" value={stats?.userStats?.admins || 0} prefix={<UserOutlined style={{ color: "#52c41a" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card 
              hoverable 
              onClick={() => applyUserFilter("manager")}
              style={{ borderRadius: 12, borderTop: "4px solid #faad14", background: userFilter === "manager" ? "#fffbe6" : "#fff" }}
            >
              <Statistic title="Quản lý" value={stats?.userStats?.managers || 0} prefix={<UserOutlined style={{ color: "#faad14" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card 
              hoverable 
              onClick={() => applyUserFilter("nhanvien")}
              style={{ borderRadius: 12, borderTop: "4px solid #ff4d4f", background: userFilter === "nhanvien" ? "#fff1f0" : "#fff" }}
            >
              <Statistic title="Nhân viên" value={stats?.userStats?.staff || 0} prefix={<UserOutlined style={{ color: "#ff4d4f" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card 
              hoverable 
              onClick={() => applyUserFilter("customer")}
              style={{ borderRadius: 12, borderTop: "4px solid #722ed1", background: userFilter === "customer" ? "#f9f0ff" : "#fff" }}
            >
              <Statistic title="Khách hàng" value={stats?.userStats?.customers || 0} prefix={<UserOutlined style={{ color: "#722ed1" }} />} />
            </Card>
          </Col>

          <Col xs={24}>
            <Card 
              title={<Space><UserOutlined /><Text strong>Danh sách {userFilter === "all" ? "tất cả thành viên" : `thành viên thuộc nhóm ${userFilter === 'admin' ? 'Quản trị' : (userFilter === 'manager' ? 'Quản lý' : (userFilter === 'nhanvien' ? 'Nhân viên' : 'Khách hàng'))}`}</Text></Space>} 
              bordered={false} 
              style={{ borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
              extra={<Button type="link" onClick={() => navigate("/users")}>Quản lý chi tiết</Button>}
            >
              <Table columns={userColumns} dataSource={filteredUsers} pagination={{ pageSize: 5 }} rowKey="_id" size="middle" />
            </Card>
          </Col>
        </Row>
      ) : (
        // DASHBOARD CHO QUẢN LÝ / NHÂN VIÊN
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}><Card hoverable onClick={() => applyFilter("today")} style={{ borderRadius: 12, border: activeFilter === "today" ? "2px solid #1677ff" : "1px solid #f0f0f0" }}><Statistic title="Doanh thu hôm nay" value={stats?.todayRevenue || 0} prefix={<DollarOutlined />} valueStyle={{ color: "#3f8600" }} suffix="đ" /></Card></Col>
          <Col xs={24} sm={12} lg={8}><Card hoverable onClick={() => applyFilter("today")} style={{ borderRadius: 12, border: activeFilter === "today" ? "2px solid #1677ff" : "1px solid #f0f0f0" }}><Statistic title="Đơn hàng hôm nay" value={stats?.todayOrdersCount || 0} prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />} /></Card></Col>
          <Col xs={24} sm={12} lg={8}><Card hoverable onClick={() => applyFilter("pending")} style={{ borderRadius: 12, border: activeFilter === "pending" ? "2px solid #ff4d4f" : "1px solid #f0f0f0", background: activeFilter === "pending" ? "#fff1f0" : "#fff" }}><Statistic title="Đơn chờ xác nhận" value={stats?.pendingOrdersCount || 0} valueStyle={{ color: stats?.pendingOrdersCount > 0 ? "#cf1322" : "inherit" }} prefix={<ClockCircleOutlined />} /></Card></Col>

          <Col xs={24} lg={16}>
            <Card title={<Space><ShoppingCartOutlined /><Text strong>{activeFilter === "pending" ? "Danh sách đơn chờ xác nhận" : (activeFilter === "today" ? "Đơn hàng trong ngày" : "Đơn hàng mới nhất")}</Text></Space>} bordered={false} style={{ borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
              <Table columns={orderColumns} dataSource={filteredOrders} pagination={{ pageSize: 5 }} rowKey="_id" size="middle" />
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card title={<Text strong>Xu hướng doanh thu (7 ngày)</Text>} bordered={false} style={{ borderRadius: 12, height: '100%' }}>
              <div style={{ height: 250 }}>
                {chartData ? <Line data={lineData} options={chartOptions} /> : <Empty description="Đang tải dữ liệu..." />}
              </div>
            </Card>
          </Col>
        </Row>
      )}
      <style>{`.ant-card-hoverable:hover { transform: translateY(-4px); box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; }`}</style>
    </div>
  );
};

export default WelcomePage;