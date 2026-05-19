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
      width={240}
      theme="dark"
      style={{
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "#001529",
        boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
        zIndex: 1001,
      }}
    >
      <div style={{ 
        height: 64, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: collapsed ? "0" : "0 16px",
        background: "rgba(255, 255, 255, 0.05)",
        marginBottom: 8
      }}>
        <div style={{ 
          width: 32, 
          height: 32, 
          background: "#1677ff", 
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          marginRight: collapsed ? 0 : 12
        }}>☕</div>
        {!collapsed && (
          <Title level={4} style={{ color: "#fff", margin: 0, fontSize: 18, letterSpacing: 1 }}>
            CafeSync
          </Title>
        )}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ backgroundColor: "transparent", borderRight: 0 }}
        items={menuItems}
      />
      
      {!collapsed && (
        <div style={{ position: "absolute", bottom: 16, width: "100%", padding: "0 16px" }}>
          <div style={{ 
            background: "rgba(255,255,255,0.05)", 
            padding: "12px", 
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#52c41a" }} />
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>System Online</Text>
          </div>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;