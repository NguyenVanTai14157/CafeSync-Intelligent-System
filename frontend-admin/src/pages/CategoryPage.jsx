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
import API_URL from "../config";

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
    <div className="modern-card animated-fade-in">
      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #faad14 0%, #d48806 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: "0 4px 12px rgba(250, 173, 20, 0.2)"
          }}>☕</div>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Quản lý danh mục</Title>
            <Text type="secondary">Phân loại sản phẩm để khách hàng dễ dàng tìm kiếm</Text>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
          style={{ height: 48, padding: "0 24px", borderRadius: 10, background: "#faad14", borderColor: "#faad14" }}
        >
          Thêm danh mục mới
        </Button>
      </div>

      {/* ===== DANH MỤC TABS ===== */}
      <div style={{ 
        display: "flex", 
        gap: 12, 
        overflowX: "auto", 
        paddingBottom: 16, 
        marginBottom: 24,
        scrollbarWidth: "none" 
      }} className="category-scroll">
        {categories.map((item) => (
          <div
            key={item._id}
            onClick={() => handleClickCategory(item._id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 12,
              background: activeCategory === item._id 
                ? "linear-gradient(135deg, #faad14 0%, #d48806 100%)" 
                : "#f8fafc",
              color: activeCategory === item._id ? "#fff" : "#64748b",
              cursor: "pointer",
              minWidth: 160,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: activeCategory === item._id ? "0 4px 12px rgba(250, 173, 20, 0.3)" : "none",
              border: activeCategory === item._id ? "none" : "1px solid #e2e8f0"
            }}
          >
            <CoffeeOutlined style={{ fontSize: 18 }} />
            <span style={{ fontWeight: 600, flex: 1 }}>{item.name}</span>

            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "edit", label: "Sửa", onClick: (e) => { e.domEvent.stopPropagation(); handleEdit(item); } },
                  { key: "delete", label: <span style={{ color: "#ff4d4f" }}>Xóa</span>, onClick: (e) => { e.domEvent.stopPropagation(); handleDelete(item._id); } },
                ],
              }}
            >
              <MoreOutlined
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  fontSize: 18, 
                  color: activeCategory === item._id ? "rgba(255,255,255,0.7)" : "#94a3b8",
                  padding: 4,
                  borderRadius: 4,
                  transition: "background 0.2s"
                }}
                className="category-more-icon"
              />
            </Dropdown>
          </div>
        ))}
      </div>

      {/* ===== SẢN PHẨM GRID ===== */}
      <Title level={4} style={{ marginBottom: 20 }}>Sản phẩm trong danh mục</Title>
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {products.length > 0 ? products.map((p) => (
            <Col xs={24} sm={12} md={8} lg={6} key={p._id}>
              <Card
                hoverable
                className="category-product-card"
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid #f1f5f9"
                }}
                cover={
                  <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                    <img
                      src={`${API_URL}/images/${p.image}`}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
                      className="product-img-hover"
                    />
                    <div style={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      background: 'rgba(255,255,255,0.9)', 
                      padding: '4px 12px', 
                      borderRadius: 20,
                      fontWeight: 700,
                      color: '#059669',
                      fontSize: 13,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {p.price.toLocaleString("vi-VN")} ₫
                    </div>
                  </div>
                }
              >
                <Title level={5} style={{ margin: 0, fontSize: 16 }}>{p.name}</Title>
                <div style={{ marginTop: 8, height: 40, overflow: 'hidden' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{p.description || "Chưa có mô tả cho sản phẩm này"}</Text>
                </div>
              </Card>
            </Col>
          )) : (
            <Col span={24}>
              <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: 12 }}>
                <Text type="secondary">Danh mục này hiện chưa có sản phẩm nào.</Text>
              </div>
            </Col>
          )}
        </Row>
      )}

      {/* ===== MODAL ===== */}
      <Modal
        open={open}
        title={editing ? "Cập nhật danh mục" : "Thêm danh mục mới"}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setName("");
        }}
        onOk={handleSubmit}
        okButtonProps={{ style: { background: '#faad14', borderColor: '#faad14' } }}
        destroyOnClose
      >
        <div style={{ padding: "12px 0" }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Tên danh mục</Text>
          <Input
            placeholder="Ví dụ: Cà phê, Trà sữa, Đồ ăn vặt..."
            size="large"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>
      </Modal>

      <style>{`
        .category-scroll::-webkit-scrollbar { display: none; }
        .animated-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .category-product-card:hover .product-img-hover {
          transform: scale(1.1);
        }
        .category-product-card {
          transition: all 0.3s !important;
        }
        .category-product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important;
        }
        .category-more-icon:hover {
          background: rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};

export default CategoryPage;