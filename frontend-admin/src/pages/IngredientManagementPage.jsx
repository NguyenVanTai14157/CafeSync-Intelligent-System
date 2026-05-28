import { useEffect, useState } from "react";
import { Table, Typography, Spin, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Tag } from "antd";
import { EditOutlined, DeleteOutlined, WarningOutlined, PlusOutlined } from "@ant-design/icons";
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

const IngredientManagementPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");

  // Load ingredients
  const fetchIngredients = () => {
    setLoading(true);
    axios.get("https://cafesync-intelligent-system-sntf.onrender.com/api/ingredients")
      .then(res => setIngredients(res.data))
      .catch(() => setIngredients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // Open modal for add/edit
  const openModal = (ingredient = null) => {
    setEditing(ingredient);
    setModalOpen(true);
    if (ingredient) {
      form.setFieldsValue(ingredient);
    } else {
      form.resetFields();
    }
  };

  // Add or update ingredient
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await axios.put(`https://cafesync-intelligent-system-sntf.onrender.com/api/ingredients/${editing._id}`, values);
        message.success("Cập nhật thành công!");
      } else {
        await axios.post("https://cafesync-intelligent-system-sntf.onrender.com/api/ingredients", values);
        message.success("Thêm mới thành công!");
      }
      setModalOpen(false);
      fetchIngredients();
    } catch (err) {
      message.error(err?.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  // Delete ingredient
  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://cafesync-intelligent-system-sntf.onrender.com/api/ingredients/${id}`);
      message.success("Xóa thành công!");
      fetchIngredients();
    } catch {
      message.error("Xóa thất bại!");
    }
  };

  const columns = [
    { title: "Tên nguyên liệu", dataIndex: "name", key: "name", render: (text) => <Text strong>{text}</Text> },
    { 
      title: "Số lượng", 
      dataIndex: "quantity", 
      key: "quantity",
      render: (v, record) => {
        const isLow = v <= record.minStock;
        return (
          <Tag color={isLow ? "red" : "blue"} style={{ borderRadius: 6, padding: "2px 10px", fontWeight: 600 }}>
            {v} {record.unit} {isLow && <WarningOutlined />}
          </Tag>
        );
      }
    },
    { title: "Tồn tối thiểu", dataIndex: "minStock", key: "minStock", render: (v, record) => `${v} ${record.unit}` },
    { 
      title: "Giá nhập", 
      dataIndex: "price", 
      key: "price", 
      render: v => <Text strong style={{ color: "#059669" }}>{v?.toLocaleString("vi-VN")} ₫</Text> 
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
            title="Xóa nguyên liệu"
            description="Bạn có chắc chắn muốn xóa nguyên liệu này?"
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
  const filteredIngredients = ingredients.filter((item) => {
    const itemName = removeAccents(item.name);
    const searchKeyword = removeAccents(searchText).trim();
    return itemName.includes(searchKeyword);
  });
  return (
    <div className="modern-card animated-fade-in">
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 12, 
          background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(22, 119, 255, 0.2)"
        }}>📦</div>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Quản lý kho nguyên liệu</Title>
          <Text type="secondary">Theo dõi và cập nhật số lượng nguyên liệu trong kho</Text>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <Button 
          type="primary" 
          size="large" 
          icon={<PlusOutlined />} 
          onClick={() => openModal()}
          style={{ height: 48, padding: "0 24px", borderRadius: 10 }}
        >
          Thêm nguyên liệu mới
        </Button>
        <Input.Search
          placeholder="Tìm kiếm nguyên liệu theo tên..."
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
          dataSource={filteredIngredients}
          columns={columns}
          rowKey="_id"
          pagination={{ 
            pageSize: 8,
            showTotal: (total) => `Tổng cộng ${total} nguyên liệu`,
            position: ["bottomRight"] 
          }}
          className="custom-table"
        />
      )}
      <style>{`
        .animated-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
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
          box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1) !important;
        }
      `}</style>

      <Modal
        open={modalOpen}
        title={editing ? "Sửa nguyên liệu" : "Thêm nguyên liệu"}
        onCancel={() => setModalOpen(false)}
        onOk={handleOk}
        okText={editing ? "Cập nhật" : "Thêm"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên nguyên liệu"
            name="name"
            rules={[{ required: true, message: "Bắt buộc nhập tên nguyên liệu" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Số lượng"
            name="quantity"
            rules={[{ required: true, message: "Bắt buộc nhập số lượng" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Đơn vị"
            name="unit"
            rules={[{ required: true, message: "Bắt buộc nhập đơn vị" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Tồn tối thiểu"
            name="minStock"
            rules={[{ required: true, message: "Bắt buộc nhập tồn tối thiểu" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Giá"
            name="price"
            rules={[{ required: true, message: "Bắt buộc nhập giá" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IngredientManagementPage;