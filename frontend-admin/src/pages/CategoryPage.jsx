import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Spin,
  Space,
  Button,
  Modal,
  Input,
  message,
  Dropdown,
} from "antd";
import {
  CoffeeOutlined,
  PlusOutlined,
  MoreOutlined,
} from "@ant-design/icons";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categoryApi";

import { getProductsByCategory } from "../api/productApi";

const { Title, Text } = Typography;

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // modal
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);

  // ===== FETCH =====
  const fetchCategories = async () => {
    const data = await getCategories();
    setCategories(data);

    if (data.length > 0) {
      handleClickCategory(data[0]._id);
    }
  };

  const handleClickCategory = async (id) => {
    setActiveCategory(id);
    setLoading(true);

    const data = await getProductsByCategory(id);
    setProducts(data);

    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ===== CRUD =====
  const handleSubmit = async () => {
    if (!name) return message.error("Nhập tên danh mục");

    if (editing) {
      await updateCategory(editing._id, { name });
      message.success("Cập nhật thành công");
    } else {
      await createCategory({ name });
      message.success("Thêm thành công");
    }

    setOpen(false);
    setName("");
    setEditing(null);
    fetchCategories();
  };

  const handleEdit = (item) => {
    setEditing(item);
    setName(item.name);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteCategory(id);
    message.success("Đã xóa");
    fetchCategories();
  };

  return (
    <div>
      {/* ===== HEADER ===== */}
      <Row justify="space-between" align="middle">
        <Title level={3}>☕ Quản lý danh mục</Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
        >
          Thêm danh mục
        </Button>
      </Row>

      {/* ===== DANH MỤC ===== */}
      <Space wrap style={{ marginBottom: 30 }}>
        {categories.map((item) => (
          <div
            key={item._id}
            onClick={() => handleClickCategory(item._id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderRadius: 30,
              background:
                activeCategory === item._id
                  ? "#3b82f6"
                  : "#e2e8f0",
              color: activeCategory === item._id ? "#fff" : "#000",
              cursor: "pointer",
              minWidth: 180,
              transition: "0.3s",
            }}
          >
            {/* TÊN */}
            <span style={{ display: "flex", gap: 6 }}>
              <CoffeeOutlined />
              {item.name}
            </span>

            {/* MENU 3 CHẤM */}
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "edit",
                    label: "Sửa",
                    onClick: () => handleEdit(item),
                  },
                  {
                    key: "delete",
                    label: (
                      <span style={{ color: "red" }}>Xóa</span>
                    ),
                    onClick: () => handleDelete(item._id),
                  },
                ],
              }}
            >
              <MoreOutlined
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 18 }}
              />
            </Dropdown>
          </div>
        ))}
      </Space>

      {/* ===== SẢN PHẨM ===== */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {products.map((p) => (
            <Col xs={24} sm={12} md={8} lg={6} key={p._id}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  transition: "0.3s",
                }}
                cover={
                  <img
                    src={`https://cafesync-intelligent-system-sntf.onrender.com/images/${p.image}`}
                    alt={p.name}
                    style={{
                      height: 200,
                      objectFit: "cover",
                    }}
                  />
                }
              >
                <Title level={5}>{p.name}</Title>
                <Text type="secondary">{p.description}</Text>
                <br />
                <Text strong style={{ color: "green" }}>
                  {p.price.toLocaleString("vi-VN")} VND
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ===== MODAL ===== */}
      <Modal
        open={open}
        title={editing ? "Sửa danh mục" : "Thêm danh mục"}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setName("");
        }}
        onOk={handleSubmit}
      >
        <Input
          placeholder="Tên danh mục"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default CategoryPage;