import { useState, useEffect } from "react";
import { Layout, notification, message } from "antd";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import axios from "axios";

const { Content } = Layout;

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [prevPendingCount, setPrevPendingCount] = useState(0);

  // Polling for new orders to show notification
  useEffect(() => {
    const checkNewOrders = async () => {
      try {
        const res = await axios.get("https://cafesync-intelligent-system-sntf.onrender.com/api/reports/stats");
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
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content
          style={{
            margin: "88px 24px 24px",
            padding: 24,
            minHeight: 280,
            background: "#fff",
            borderRadius: 8,
            marginLeft: collapsed ? 104 : 264,
            transition: "all 0.2s",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;