import { useState, useEffect } from "react";
import { Layout, notification, ConfigProvider } from "antd";
import '../cafe-theme.css';
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import axios from "axios";
import API_URL from "../config";

const { Content } = Layout;

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(0);

  // Polling for new orders to show notification
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/reports/stats`);
        const currentCount = res.data.pendingOrdersCount;
        
        if (currentCount > prevPendingCount) {
          notification.info({
            message: "Có đơn hàng mới!",
            description: `Bạn có ${currentCount} đơn hàng đang chờ xác nhận.`,
            placement: "topRight",
            duration: 5,
          });
          // Play a subtle sound if possible or just visual
        }
        setPrevPendingCount(currentCount);
      } catch (error) {
        console.error("Notification polling error:", error);
      }
    };

    const interval = setInterval(checkNewOrders, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [prevPendingCount]);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#795c43', colorInfo: '#795c43', colorSuccess: '#587b68', colorText: '#302e2a', colorTextSecondary: '#827d73', colorBgLayout: '#f5f3ee', colorBorder: '#e5e0d7', borderRadius: 10, fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' } }}>
    <Layout className="cafe-admin" style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content
          style={{
            margin: "88px 24px 24px",
            padding: 0,
            minHeight: "calc(100vh - 120px)",
            background: "transparent",
            borderRadius: 16,
            marginLeft: collapsed ? 104 : 244,
            transition: "all 0.2s",
            boxShadow: "none",
            border: "none"
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
};

export default AdminLayout;
