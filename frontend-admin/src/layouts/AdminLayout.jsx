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
            margin: "96px 24px 24px",
            padding: 24,
            minHeight: "calc(100vh - 120px)",
            background: "#ffffff",
            borderRadius: 16,
            marginLeft: collapsed ? 104 : 284,
            transition: "all 0.2s",
            boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
            border: "1px solid #f1f5f9"
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;