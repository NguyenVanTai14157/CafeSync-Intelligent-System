import { useEffect, useState } from "react";
import { Table, Typography, Spin, Button, Modal, Form, Input, Select, Popconfirm, message } from "antd";
import axios from "axios";

const { Title } = Typography;

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
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Tên", dataIndex: "name", key: "name" },
    { 
      title: "Vai trò", 
      dataIndex: "role", 
      key: "role",
      render: (role) => {
        const labels = {
          'admin': 'Quản trị',
          'manager': 'Quản lý',
          'nhanvien': 'Nhân viên',
          'customer': 'Khách hàng'
        };
        return labels[role] || role;
      }
    },
    { title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt", render: v => new Date(v).toLocaleString() },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => openModal(record)} style={{ marginRight: 8 }}>Sửa</Button>
          <Popconfirm
            title="Bạn chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  const filteredUsers = users.filter((user) => {
    const name = removeAccents(user.name);
    const keyword = removeAccents(searchText).trim();
    return name.includes(keyword);
  });

  return (
    <div>
      <Title level={3}>👤 Quản lý Người dùng</Title>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Button type="primary" onClick={() => openModal()}>
          Thêm người dùng
        </Button>
        <Input.Search
          placeholder="Tìm kiếm theo tên người dùng..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {loading ? (
        <Spin />
      ) : (
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 8 }}
        />
      )}

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