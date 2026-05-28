import { useEffect, useState } from "react";
import { Table, Typography, Spin, Button, Modal, Form, Input, Select, Popconfirm, message, Tag } from "antd";
import { EditOutlined, DeleteOutlined, UserOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const removeAccents = (str) => {
  if (!str) return "";
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  return str;
};

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");

  // Load users
  const fetchUsers = () => {
    setLoading(true);
    axios.get("https://cafesync-intelligent-system-sntf.onrender.com/api/users")
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open modal for add/edit
  const openModal = (user = null) => {
    setEditingUser(user);
    setModalOpen(true);
    if (user) {
      form.setFieldsValue({ ...user, password: "" });
    } else {
      form.resetFields();
    }
  };

  // Add or update user
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        // Update
        await axios.put(`https://cafesync-intelligent-system-sntf.onrender.com/api/users/${editingUser._id}`, values);
        message.success("Cập nhật thành công!");
      } else {
        // Add
        await axios.post("https://cafesync-intelligent-system-sntf.onrender.com/api/users", values);
        message.success("Thêm mới thành công!");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      message.error(err?.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  // Delete user
  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://cafesync-intelligent-system-sntf.onrender.com/api/users/${id}`);
      message.success("Xóa thành công!");
      fetchUsers();
    } catch {
      message.error("Xóa thất bại!");
    }
  };

  const columns = [
    { 
      title: "Họ và tên", 
      dataIndex: "name", 
      key: "name",
      render: (text) => <Text strong style={{ fontSize: 14 }}>{text}</Text>
    },
    { 
      title: "Email", 
      dataIndex: "email", 
      key: "email",
      render: (text) => <Text type="secondary">{text}</Text>
    },
    { 
      title: "Vai trò", 
      dataIndex: "role", 
      key: "role",
      render: (role) => {
        const roleConfig = {
          'admin': { label: 'Quản trị viên', color: 'red', icon: <UserOutlined /> },
          'manager': { label: 'Quản lý', color: 'purple', icon: <UserOutlined /> },
          'nhanvien': { label: 'Nhân viên', color: 'blue', icon: <UserOutlined /> },
          'customer': { label: 'Khách hàng', color: 'green', icon: <UserOutlined /> }
        };
        const config = roleConfig[role] || { label: role, color: 'default' };
        return (
          <Tag color={config.color} icon={config.icon} style={{ borderRadius: 6, padding: '2px 10px' }}>
            {config.label}
          </Tag>
        );
      }
    },
    { 
      title: "Ngày tham gia", 
      dataIndex: "createdAt", 
      key: "createdAt", 
      render: v => <Text style={{ fontSize: 13, color: '#64748b' }}>{new Date(v).toLocaleDateString('vi-VN')}</Text> 
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 12 }}>
          <Button 
            type="text"
            icon={<EditOutlined style={{ color: "#1677ff" }} />} 
            onClick={() => openModal(record)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(22, 119, 255, 0.05)' }}
          />
          <Popconfirm
            title="Xóa người dùng"
            description="Dữ liệu nhân sự này sẽ bị xóa vĩnh viễn?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 77, 79, 0.05)' }}
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filteredUsers = users.filter((user) => {
    const name = removeAccents(user.name || "");
    const email = removeAccents(user.email || "");
    const keyword = removeAccents(searchText).trim();
    return name.includes(keyword) || email.includes(keyword);
  });

  return (
    <div className="modern-card animated-fade-in">
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 12, 
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
        }}>👤</div>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Quản lý Nhân sự</Title>
          <Text type="secondary">Phân quyền và quản lý tài khoản thành viên trong hệ thống</Text>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <Button 
          type="primary" 
          size="large" 
          icon={<PlusOutlined />} 
          onClick={() => openModal()}
          style={{ height: 48, padding: "0 24px", borderRadius: 10, background: "#10b981", borderColor: "#10b981" }}
        >
          Thêm người dùng mới
        </Button>
        <Input.Search
          placeholder="Tìm kiếm theo tên hoặc email..."
          allowClear
          size="large"
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 350 }}
          className="search-input-modern"
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px 0" }}><Spin size="large" /></div>
      ) : (
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="_id"
          pagination={{ 
            pageSize: 8,
            showTotal: (total) => `Tổng cộng ${total} người dùng`,
            position: ["bottomRight"] 
          }}
        />
      )}
      <style>{`
        .animated-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .search-input-modern .ant-input-affix-wrapper {
          border-radius: 10px !important;
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }
        .search-input-modern .ant-input-affix-wrapper-focused {
          background: #fff !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }
      `}</style>

      <Modal
        open={modalOpen}
        title={editingUser ? "Sửa người dùng" : "Thêm người dùng"}
        onCancel={() => setModalOpen(false)}
        onOk={handleOk}
        okText={editingUser ? "Cập nhật" : "Thêm"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Bắt buộc nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="example@email.com" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: "Bắt buộc nhập mật khẩu" }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="Tên" name="name">
            <Input />
          </Form.Item>
          <Form.Item
            label="Vai trò"
            name="role"
            rules={[{ required: true, message: "Bắt buộc chọn vai trò" }]}
          >
            <Select>
              <Select.Option value="admin">Quản trị</Select.Option>
              <Select.Option value="manager">Quản lý</Select.Option>
              <Select.Option value="nhanvien">Nhân viên</Select.Option>
              <Select.Option value="customer">Khách hàng</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;