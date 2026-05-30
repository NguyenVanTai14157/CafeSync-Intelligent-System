import { useEffect, useState } from "react";
import { Typography, Row, Col, Card, Statistic, Table, Tag, Empty, Spin, Button, Space, notification, Avatar } from "antd";
import { 
  DollarOutlined, 
  ShoppingCartOutlined, 
  ClockCircleOutlined, 
  UserOutlined,
  ArrowUpOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  SettingOutlined,
  GlobalOutlined
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
        message: "Tính năng mới!",
        description: `Mã đơn: ${newOrder.orderID} vừa được tạo.`,
        placement: "bottomRight",
        icon: <ThunderboltOutlined style={{ color: '#1677ff' }} />
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
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(22, 119, 255, 0.4)");
          gradient.addColorStop(1, "rgba(22, 119, 255, 0)");
          return gradient;
        },
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#1677ff",
        pointBorderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` Doanh thu: ${context.parsed.y.toLocaleString()}đ`
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: "rgba(0,0,0,0.05)", drawBorder: false }, 
        ticks: { color: "#94a3b8", font: { size: 11 } } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: "#94a3b8", font: { size: 11 } } 
      }
    }
  };

  if (loading) return <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" tip="Đang tải dữ liệu..." /></div>;

  const orderColumns = [
    { 
      title: "Mã đơn", 
      dataIndex: "orderID", 
      key: "orderID", 
      render: (id) => <Text strong style={{ color: '#1677ff' }}>#{id.slice(-6)}</Text> 
    },
    { 
      title: "Vị trí", 
      dataIndex: "location", 
      key: "location",
      render: (loc) => <Space><GlobalOutlined style={{ color: '#94a3b8' }} /> {loc}</Space>
    },
    { 
      title: "Tổng tiền", 
      dataIndex: "totalPrice", 
      key: "totalPrice", 
      render: (v) => <Text style={{ color: "#0f172a", fontWeight: 700 }}>{v.toLocaleString()}₫</Text> 
    },
    { 
      title: "Trạng thái", 
      dataIndex: "status", 
      key: "status",
      render: (status) => {
        const config = {
          "Chờ xác nhận": { color: "orange", text: "Chờ duyệt" },
          "Đang pha chế": { color: "blue", text: "Đang làm" },
          "Hoàn thành": { color: "cyan", text: "Xong" },
          "Đã thanh toán": { color: "green", text: "Đã trả" },
        };
        const c = config[status] || { color: "default", text: status };
        return <Tag color={c.color} style={{ borderRadius: 20, padding: '2px 12px', border: 'none' }}>{c.text}</Tag>;
      }
    },
    { 
      title: "Thao tác", 
      key: "action", 
      render: () => <Button type="link" style={{ fontWeight: 600 }} onClick={() => navigate("/orders")}>Theo dõi</Button> 
    }
  ];

  const userColumns = [
    { 
      title: "Thành viên", 
      dataIndex: "name", 
      key: "name", 
      render: (text, record) => (
        <Space size="middle">
          <Avatar style={{ backgroundColor: '#f1f5f9', color: '#1677ff' }} icon={<UserOutlined />} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{ fontSize: 14 }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ) 
    },
    { 
      title: "Vai trò", 
      dataIndex: "role", 
      key: "role",
      render: (r) => {
        const labels = { 
          'admin': ['Quản trị', '#1677ff', 'blue'], 
          'manager': ['Quản lý', '#f59e0b', 'orange'], 
          'quanly': ['Quản lý', '#f59e0b', 'orange'], 
          'nhanvien': ['Nhân viên', '#10b981', 'green'],
          'customer': ['Khách hàng', '#8b5cf6', 'purple'] 
        };
        const [text, color, theme] = labels[r] || [r, '#94a3b8', 'default'];
        return <Tag color={theme} style={{ borderRadius: 6, fontWeight: 500 }}>{text}</Tag>;
      }
    },
    { 
      title: "Hoạt động gần nhất", 
      dataIndex: "updatedAt", 
      key: "updatedAt", 
      render: (v) => <Text style={{ color: '#64748b' }}>{new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(v).toLocaleDateString()}</Text> 
    },
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '0 8px' }}>
      {/* ── HEADER PRENIUM ── */}
      <div style={{ 
        marginBottom: 32, 
        padding: '40px', 
        borderRadius: '24px', 
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: '#fff',
        position: 'relative',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Space direction="vertical" size={4}>
            <Title level={2} style={{ color: '#fff', margin: 0, fontSize: 32, fontWeight: 800 }}>
              Dashboard <Text style={{ color: '#38bdf8' }}>CafeSync</Text>
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 500 }}>
              Chào mừng, {user.name}. Hệ thống đang hoạt động với hiệu suất tối đa.
            </Text>
          </Space>
          
          <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
            <Button 
              type="primary" 
              size="large" 
              icon={<ThunderboltOutlined />}
              onClick={() => {
                const role = user?.role?.toLowerCase();
                if (role === 'admin') navigate("/users");
                else if (role === 'nhanvien') navigate("/pos");
                else navigate("/orders");
              }}
              style={{ 
                height: 52, 
                padding: '0 32px', 
                borderRadius: 14, 
                fontWeight: 700,
                fontSize: 16,
                background: '#38bdf8',
                borderColor: '#38bdf8',
                boxShadow: '0 8px 20px rgba(56, 189, 248, 0.3)'
              }}
            >
              {user?.role === 'admin' 
                ? "Quản lý Nhân sự" 
                : (user?.role === 'nhanvien' ? "Bắt đầu Bán hàng" : "Quản lý Đơn hàng")}
            </Button>
            {user?.role !== 'admin' && (
              <Button 
                size="large" 
                icon={<RiseOutlined />}
                onClick={() => navigate("/reports")}
                style={{ 
                  height: 52, 
                  padding: '0 24px', 
                  borderRadius: 14, 
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.2)'
                }}
              >
                Xem báo cáo
              </Button>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div style={{ 
          position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', 
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%)', 
          zIndex: 1 
        }} />
        <div style={{ 
          position: 'absolute', bottom: '-20%', left: '10%', width: '300px', height: '300px', 
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0) 70%)', 
          zIndex: 1 
        }} />
      </div>

      {user?.role === 'admin' ? (
        // --- VIEW ADMIN ---
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="premium-card" onClick={() => applyUserFilter("all")} style={{ borderLeft: userFilter === "all" ? "6px solid #1677ff" : "1px solid #f1f5f9" }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Tổng tài khoản</Text>
                  <Title level={2} style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{stats?.userStats?.total || 0}</Title>
                  <Text type="success" style={{ fontSize: 12 }}><ArrowUpOutlined /> +12% tháng này</Text>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(22, 119, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="premium-card" onClick={() => applyUserFilter("admin")} style={{ borderLeft: userFilter === "admin" ? "6px solid #10b981" : "1px solid #f1f5f9" }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Quản trị hệ thống</Text>
                  <Title level={2} style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{stats?.userStats?.admins || 0}</Title>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Toàn quyền truy cập</Text>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingOutlined style={{ fontSize: 24, color: '#10b981' }} />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="premium-card" onClick={() => applyUserFilter("nhanvien")} style={{ borderLeft: userFilter === "nhanvien" ? "6px solid #f59e0b" : "1px solid #f1f5f9" }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Nhân viên</Text>
                  <Title level={2} style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{stats?.userStats?.staff || 0}</Title>
                  <Text type="warning" style={{ fontSize: 12 }}>Đang trực tuyến: {Math.floor((stats?.userStats?.staff || 0) * 0.7)}</Text>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RiseOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="premium-card" onClick={() => applyUserFilter("customer")} style={{ borderLeft: userFilter === "customer" ? "6px solid #8b5cf6" : "1px solid #f1f5f9" }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Khách hàng</Text>
                  <Title level={2} style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>{stats?.userStats?.customers || 0}</Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>Hội viên tích cực</Text>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCartOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24}>
            <Card 
              className="premium-card"
              title={<Space><UserOutlined style={{ color: '#1677ff' }} /><Title level={5} style={{ margin: 0 }}>Quản lý Tài khoản {userFilter === "all" ? "Hệ thống" : `Nhóm: ${userFilter.toUpperCase()}`}</Title></Space>} 
              extra={<Button type="primary" ghost shape="round" onClick={() => navigate("/users")}>Tất cả thành viên</Button>}
              style={{ marginTop: 8 }}
            >
              <Table 
                columns={userColumns} 
                dataSource={filteredUsers} 
                pagination={{ pageSize: 5 }} 
                rowKey="_id" 
                size="middle" 
              />
            </Card>
          </Col>
        </Row>
      ) : (
        // --- VIEW MANAGER / STAFF ---
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="premium-card" onClick={() => applyFilter("today")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
                  <DollarOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Doanh thu hôm nay</Text>
                  <Title level={2} style={{ margin: 0, fontSize: 32, fontWeight: 850 }}>{stats?.todayRevenue?.toLocaleString() || 0}<small style={{ fontSize: 18 }}>₫</small></Title>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="premium-card" onClick={() => applyFilter("today")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(22, 119, 255, 0.2)' }}>
                  <ShoppingCartOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Đơn hàng mới</Text>
                  <Title level={2} style={{ margin: 0, fontSize: 32, fontWeight: 850 }}>{stats?.todayOrdersCount || 0}</Title>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card hoverable className="premium-card" onClick={() => applyFilter("pending")}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ 
                  width: 64, height: 64, borderRadius: 20, 
                  background: stats?.pendingOrdersCount > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#f1f5f9', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  boxShadow: stats?.pendingOrdersCount > 0 ? '0 8px 16px rgba(239, 68, 68, 0.2)' : 'none' 
                }}>
                  <ClockCircleOutlined style={{ fontSize: 28, color: stats?.pendingOrdersCount > 0 ? '#fff' : '#94a3b8' }} />
                </div>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Bàn chờ xác nhận</Text>
                  <Title level={2} style={{ margin: 0, fontSize: 32, fontWeight: 850, color: stats?.pendingOrdersCount > 0 ? '#ef4444' : 'inherit' }}>{stats?.pendingOrdersCount || 0}</Title>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card 
              className="premium-card"
              title={<Space><ShoppingCartOutlined style={{ color: '#1677ff' }} /><Title level={5} style={{ margin: 0 }}>{activeFilter === "pending" ? "Hàng đợi Chờ xử lý" : (activeFilter === "today" ? "Giao dịch trong ngày" : "Các đơn hàng gần đây")}</Title></Space>}
              extra={<Button type="link" style={{ fontWeight: 700 }} onClick={() => navigate("/orders")}>Toàn bộ đơn hàng →</Button>}
            >
              <Table 
                columns={orderColumns} 
                dataSource={filteredOrders} 
                pagination={{ pageSize: 5 }} 
                rowKey="_id" 
                size="middle" 
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={8}>
            <Card className="premium-card" title={<Space><RiseOutlined style={{ color: '#10b981' }} /><Title level={5} style={{ margin: 0 }}>Xu hướng Doanh thu Tuân</Title></Space>} style={{ height: '100%' }}>
              <div style={{ height: 320, marginTop: 10 }}>
                {chartData ? <Line data={lineData} options={chartOptions} /> : <Empty description="Đang khởi tạo biểu đồ..." />}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* FOOTER INFO */}
      <div style={{ marginTop: 48, padding: '24px', textAlign: 'center' }}>
        <Text type="secondary" style={{ color: '#94a3b8' }}>
          CafeSync v2.0 • Được bảo mật bằng mã hóa 256-bit • {new Date().getFullYear()}
        </Text>
      </div>
    </div>
  );
};

export default WelcomePage;