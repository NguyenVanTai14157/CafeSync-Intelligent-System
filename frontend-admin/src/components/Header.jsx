import { useState } from "react";
import { Layout, Avatar, Dropdown, Space, Typography, Modal, Button, Descriptions, Breadcrumb, Badge } from "antd";
import { 
  UserOutlined, 
  LogoutOutlined, 
  IdcardOutlined, 
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation, Link } from "react-router-dom";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userName = user?.name || "Người dùng";

  const getRoleLabel = (role) => {
    const roles = {
      'admin': 'Quản trị',
      'manager': 'Quản lý',
      'quanly': 'Quản lý',
      'nhanvien': 'Nhân viên'
    };
    return roles[role?.toLowerCase()] || role;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const items = [
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => setIsProfileModalVisible(true),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Breadcrumb mapping
  const breadcrumbNameMap = {
    "/": "Dashboard",
    "/orders": "Đơn hàng",
    "/pos": "Bán hàng",
    "/CategoryPage": "Danh mục",
    "/products": "Sản phẩm",
    "/ingredients": "Kho hàng",
    "/users": "Nhân sự",
    "/reports": "Báo cáo",
    "/profile": "Hồ sơ",
  };

  const pathContent = breadcrumbNameMap[location.pathname] || "Trang chủ";

  return (
    <AntHeader
      className="glass-effect"
      style={{
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        position: "fixed",
        top: 0,
        right: 0,
        height: 72,
        zIndex: 1000,
        transition: "all 0.2s",
        marginLeft: collapsed ? 80 : 260,
        width: collapsed ? "calc(100% - 80px)" : "calc(100% - 260px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ 
            fontSize: "18px", 
            width: 40, 
            height: 40, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: '8px'
          }}
        />
        <Breadcrumb 
          style={{ marginLeft: 24 }}
          items={[
            { title: <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>{getRoleLabel(user?.role)}</span> },
            { title: <span style={{ color: "rgba(0,0,0,0.85)", fontWeight: 600, fontSize: 13 }}>{pathContent}</span> }
          ]}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Badge dot color="#1677ff" offset={[-2, 4]}>
          <Button 
            type="text" 
            icon={<BellOutlined style={{ fontSize: 18, color: "rgba(0,0,0,0.65)" }} />} 
            style={{ width: 40, height: 40, borderRadius: 8 }}
          />
        </Badge>
        
        <Dropdown menu={{ items }} placement="bottomRight" arrow>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            cursor: "pointer", 
            padding: "6px 12px", 
            borderRadius: 10,
            transition: "all 0.3s",
            background: "rgba(0,0,0,0.02)" 
          }} className="header-user-dropdown">
            <Avatar 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: "#1677ff",
                boxShadow: "0 2px 8px rgba(22, 119, 255, 0.2)"
              }} 
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
              <Text strong style={{ fontSize: 13, color: "rgba(0,0,0,0.85)" }}>{userName}</Text>
              <Text style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", fontWeight: 500 }}>{getRoleLabel(user?.role)}</Text>
            </div>
          </div>
        </Dropdown>
        <style>{`
          .header-user-dropdown:hover {
            background: rgba(0,0,0,0.05) !important;
          }
        `}</style>
      </div>

      <Modal
        title="Thông tin cá nhân"
        open={isProfileModalVisible}
        onCancel={() => setIsProfileModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsProfileModalVisible(false)}>Đóng</Button>,
          <Button 
            key="edit" 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => {
              setIsProfileModalVisible(false);
              navigate("/profile");
            }}
          >Chỉnh sửa</Button>,
        ]}
      >
        {user ? (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Họ và tên">{user.name}</Descriptions.Item>
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Text type="secondary">
                {getRoleLabel(user?.role)}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text>Không có thông tin</Text>
        )}
      </Modal>
    </AntHeader>
  );
};

export default Header;