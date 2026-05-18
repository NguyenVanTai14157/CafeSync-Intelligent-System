import { useEffect, useState } from "react";
import { Table, Typography, Spin, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Tag } from "antd";
import { EditOutlined, DeleteOutlined, WarningOutlined } from "@ant-design/icons";
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
      render: (v, record) => (
        <span style={{ 
          color: v <= record.minStock ? "#cf1322" : "inherit", 
          fontWeight: v <= record.minStock ? "bold" : "normal" 
        }}>
          {v} {v <= record.minStock && <WarningOutlined style={{ marginLeft: 4 }} />}
        </span>
      )
    },
    { title: "Đơn vị", dataIndex: "unit", key: "unit" },
    { title: "Tồn tối thiểu", dataIndex: "minStock", key: "minStock" },
    { title: "Giá", dataIndex: "price", key: "price", render: v => v?.toLocaleString("vi-VN") + " VND" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
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
    <div>
      <Title level={3}>📦 Quản lý kho nguyên liệu</Title>

      {/* 2 Nút thêm và tìm kiếm nằm ngang hàng */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Button type="primary" onClick={() => openModal()}>
          Thêm nguyên liệu
        </Button>
        <Input.Search
          placeholder="Tìm kiếm nguyên liệu..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      {loading ? (
        <Spin />
      ) : (
        <Table
          dataSource={filteredIngredients} // Nạp dữ liệu ĐÃ QUA BỘ LỌC vào đây
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 8 }}
        />
      )}

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