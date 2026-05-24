import { Layout, Menu, Typography, Divider } from "antd";
import {
  AppstoreOutlined,
  UserOutlined,
  CoffeeOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;
const { Title, Text } = Typography;

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role ? user.role.toLowerCase() : "";

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      onClick: () => navigate("/"),
    },
  ];

  // 2. Chức năng QUẢN LÝ (Chỉ dành cho QUẢN LÝ)
  if (role === "manager" || role === "quanly") {
    menuItems.push(
      { type: "divider" },
      { label: "QUẢN LÝ VẬN HÀNH", type: "group", children: [
        { key: "/orders", icon: <FileTextOutlined />, label: "Đơn hàng", onClick: () => navigate("/orders") },
        { key: "/CategoryPage", icon: <AppstoreOutlined />, label: "Danh mục", onClick: () => navigate("/CategoryPage") },
        { key: "/products", icon: <CoffeeOutlined />, label: "Sản phẩm", onClick: () => navigate("/products") },
        { key: "/ingredients", icon: <DatabaseOutlined />, label: "Kho hàng", onClick: () => navigate("/ingredients") },
        { key: "/tables", icon: <AppstoreOutlined />, label: "Bàn & QR", onClick: () => navigate("/tables") },
      ]},
      { type: "divider" },
      { label: "PHÂN TÍCH", type: "group", children: [
        { key: "/reports", icon: <LineChartOutlined />, label: "Báo cáo", onClick: () => navigate("/reports") },
      ]}
    );
  }

  // 3. Chức năng QUẢN TRỊ (Chỉ dành cho ADMIN)
  if (role === "admin") {
    menuItems.push(
      { type: "divider" },
      { label: "QUẢN TRỊ", type: "group", children: [
        { key: "/users", icon: <UserOutlined />, label: "Nhân sự", onClick: () => navigate("/users") },
      ]}
    );
  }

  // 4. Chức năng NHÂN VIÊN & POS (Những role này được dùng POS)
  if (role === "nhanvien") {
    menuItems.push(
      { key: "/orders", icon: <FileTextOutlined />, label: "Đơn hàng", onClick: () => navigate("/orders") },
      {
        key: "/pos",
        icon: <ShoppingCartOutlined />,
        label: "Bán hàng (POS)",
        onClick: () => navigate("/pos"),
      }
    );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={260}
      theme="dark"
      style={{
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        background: "linear-gradient(180deg, #001529 0%, #000c17 100%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
        zIndex: 1001,
      }}
    >
      <div style={{ 
        height: 80, 
        display: "flex", 
        alignItems: "center", 
        padding: collapsed ? "0" : "0 24px",
        justifyContent: collapsed ? "center" : "flex-start",
        marginBottom: 16,
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
      }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)", 
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
          marginRight: collapsed ? 0 : 12,
          flexShrink: 0
        }}>☕</div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text style={{ color: "#fff", fontWeight: 700, fontSize: 20, letterSpacing: 0.5, lineHeight: 1.2 }}>
              CafeSync
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Intelligent System
            </Text>
          </div>
        )}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ 
          backgroundColor: "transparent", 
          borderRight: 0,
          padding: "0 12px" 
        }}
        items={menuItems.map(item => {
          if (item.type === 'group') {
            return {
              ...item,
              label: <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: 1.5 }}>{item.label}</span>
            };
          }
          return item;
        })}
      />
      
      {!collapsed && (
        <div style={{ position: "absolute", bottom: 24, width: "100%", padding: "0 24px" }}>
          <div style={{ 
            background: "rgba(255,255,255,0.03)", 
            padding: "16px", 
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <div className="pulse-dot" style={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              background: "#52c41a",
              boxShadow: "0 0 0 rgba(82, 196, 26, 0.4)",
              animation: "pulse 2s infinite"
            }} />
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 500 }}>System Online</Text>
          </div>
          <style>{`
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7); }
              70% { box-shadow: 0 0 0 10px rgba(82, 196, 26, 0); }
              100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
            }
            .ant-menu-item { border-radius: 8px !important; margin-bottom: 4px !important; }
            .ant-menu-item-selected { background: linear-gradient(90deg, rgba(22, 119, 255, 0.2) 0%, rgba(22, 119, 255, 0.05) 100%) !important; color: #fff !important; }
            .ant-menu-item-selected .anticon { color: #1677ff !important; }
          `}</style>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;