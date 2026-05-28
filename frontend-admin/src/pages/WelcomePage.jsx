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
        const config = {
          "Chờ xác nhận": { color: "orange" },
          "Đang pha chế": { color: "blue" },
          "Hoàn thành": { color: "cyan" },
          "Đã thanh toán": { color: "green" },
        };
        const c = config[status] || { color: "default" };
        return <Tag color={c.color} style={{ borderRadius: 6, padding: '2px 10px', fontWeight: 600 }}>{status.toUpperCase()}</Tag>;
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
    <div className="animated-fade-in">
      {/* ── GREETING AREA ── */}
      <div style={{ 
        marginBottom: 32, 
        padding: '32px', 
        borderRadius: 20, 
        background: 'linear-gradient(135deg, #1677ff 0%, #722ed1 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(22, 119, 255, 0.25)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 28 }}>Chào mừng trở lại, {user.name}! 👋</Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
            {user?.role === 'admin' 
              ? "Hệ thống đang hoạt động ổn định. Bạn có thể quản lý tài khoản và quyền truy cập tại đây."
              : `Hệ thống đang hoạt động ổn định. Hôm nay bạn có ${stats?.todayOrdersCount || 0} đơn hàng mới.`}
          </Text>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => navigate(user?.role === 'admin' ? "/users" : "/pos")}
              style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 10 }}
            >
              {user?.role === 'admin' ? "Quản lý Nhân sự" : "Mở POS Bán hàng"}
            </Button>
            {user?.role !== 'admin' && activeFilter !== "recent" && (
              <Button 
                size="large" 
                onClick={() => applyFilter("recent")}
                style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 10 }}
              >
                Xem đơn gần đây
              </Button>
            )}
          </div>
        </div>
        {/* Decorative background elements */}
        <div style={{ 
          position: 'absolute', top: -50, right: -50, width: 200, height: 200, 
          borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0 
        }} />
        <div style={{ 
          position: 'absolute', bottom: -20, right: 100, width: 100, height: 100, 
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 
        }} />
      </div>

      {user?.role === 'admin' ? (
        // DASHBOARD CHO QUẢN TRỊ
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={4}>
            <Card hoverable className="modern-card stat-card-admin" onClick={() => applyUserFilter("all")} style={{ borderTop: "4px solid #1677ff", background: userFilter === "all" ? "#f0f9ff" : "#fff" }}>
              <Statistic title="Tổng tài khoản" value={stats?.userStats?.total || 0} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card hoverable className="modern-card stat-card-admin" onClick={() => applyUserFilter("admin")} style={{ borderTop: "4px solid #10b981", background: userFilter === "admin" ? "#f0fdf4" : "#fff" }}>
              <Statistic title="Quản trị viên" value={stats?.userStats?.admins || 0} prefix={<UserOutlined style={{ color: "#10b981" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card hoverable className="modern-card stat-card-admin" onClick={() => applyUserFilter("manager")} style={{ borderTop: "4px solid #f59e0b", background: userFilter === "manager" ? "#fffbeb" : "#fff" }}>
              <Statistic title="Quản lý" value={stats?.userStats?.managers || 0} prefix={<UserOutlined style={{ color: "#f59e0b" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card hoverable className="modern-card stat-card-admin" onClick={() => applyUserFilter("nhanvien")} style={{ borderTop: "4px solid #ef4444", background: userFilter === "nhanvien" ? "#fef2f2" : "#fff" }}>
              <Statistic title="Nhân viên" value={stats?.userStats?.staff || 0} prefix={<UserOutlined style={{ color: "#ef4444" }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <Card hoverable className="modern-card stat-card-admin" onClick={() => applyUserFilter("customer")} style={{ borderTop: "4px solid #8b5cf6", background: userFilter === "customer" ? "#f5f3ff" : "#fff" }}>
              <Statistic title="Khách hàng" value={stats?.userStats?.customers || 0} prefix={<UserOutlined style={{ color: "#8b5cf6" }} />} />
            </Card>
          </Col>

          <Col xs={24}>
            <Card 
              className="modern-card"
              title={<Space><UserOutlined style={{ color: '#1677ff' }} /><Text strong style={{ fontSize: 16 }}>Danh sách {userFilter === "all" ? "thành viên hệ thống" : `thành viên: ${userFilter.toUpperCase()}`}</Text></Space>} 
              extra={<Button type="link" style={{ fontWeight: 600 }} onClick={() => navigate("/users")}>Quản lý chi tiết →</Button>}
            >
              <Table columns={userColumns} dataSource={filteredUsers} pagination={{ pageSize: 5 }} rowKey="_id" size="middle" className="modern-table" />
            </Card>
          </Col>
        </Row>
      ) : (
        // DASHBOARD CHO QUẢN LÝ / NHÂN VIÊN
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="modern-card" onClick={() => applyFilter("today")} style={{ borderLeft: activeFilter === "today" ? "4px solid #10b981" : "none" }}>
              <Statistic title="Doanh thu hôm nay" value={stats?.todayRevenue || 0} prefix={<DollarOutlined />} valueStyle={{ color: "#10b981", fontWeight: 800 }} suffix="₫" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="modern-card" onClick={() => applyFilter("today")} style={{ borderLeft: activeFilter === "today" ? "4px solid #1677ff" : "none" }}>
              <Statistic title="Đơn hàng mới" value={stats?.todayOrdersCount || 0} prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />} valueStyle={{ fontWeight: 800 }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="modern-card" onClick={() => applyFilter("pending")} style={{ borderLeft: activeFilter === "pending" ? "4px solid #ef4444" : "none", background: activeFilter === "pending" ? "#fef2f2" : "#fff" }}>
              <Statistic title="Đang chờ xác nhận" value={stats?.pendingOrdersCount || 0} valueStyle={{ color: stats?.pendingOrdersCount > 0 ? "#ef4444" : "inherit", fontWeight: 800 }} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card 
              className="modern-card"
              title={<Space><ShoppingCartOutlined style={{ color: '#1677ff' }} /><Text strong style={{ fontSize: 16 }}>{activeFilter === "pending" ? "Đơn hàng đang chờ" : (activeFilter === "today" ? "Đơn hàng trong ngày" : "Đơn hàng gần đây")}</Text></Space>}
              extra={<Button type="link" style={{ fontWeight: 600 }} onClick={() => navigate("/orders")}>Tất cả đơn hàng →</Button>}
            >
              <Table columns={orderColumns} dataSource={filteredOrders} pagination={{ pageSize: 5 }} rowKey="_id" size="middle" className="modern-table" />
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card className="modern-card" title={<Space><DollarOutlined style={{ color: '#10b981' }} /><Text strong style={{ fontSize: 16 }}>Biểu đồ doanh thu tuần</Text></Space>} style={{ height: '100%' }}>
              <div style={{ height: 280, marginTop: 10 }}>
                {chartData ? <Line data={lineData} options={chartOptions} /> : <Empty description="Đang cập nhật..." />}
              </div>
            </Card>
          </Col>
        </Row>
      )}
      <style>{`
        .animated-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card-admin {
          transition: all 0.3s !important;
        }
        .stat-card-admin:hover {
          transform: translateY(-8px) !important;
        }
        .modern-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #64748b !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .ant-statistic-title {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #64748b !important;
          margin-bottom: 8px !important;
        }
      `}</style>
    </div>
  );
};

export default WelcomePage;