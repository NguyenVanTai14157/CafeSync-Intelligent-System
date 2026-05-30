import React, { useEffect, useState } from "react";
import axiosClient from "../services/axiosClient";
import API_URL from "../config";
import { 
  Modal, 
  Form, 
  Select, 
  Input, 
  Button, 
  Row, 
  Col, 
  Card, 
  Typography, 
  Space, 
  Divider, 
  Empty, 
  message,
  Checkbox,
  Tag 
} from "antd";
import { 
  PlusOutlined, 
  ShoppingCartOutlined, 
  SearchOutlined, 
  DeleteOutlined, 
  EditOutlined,
  MinusOutlined
} from "@ant-design/icons";

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

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("pos_cart");
    return saved ? JSON.parse(saved) : [];
  });
  const [optionModal, setOptionModal] = useState({ open: false, product: null });
  const [optionForm] = Form.useForm();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    localStorage.setItem("pos_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    axiosClient.get("/products")
      .then(res => setProducts(res.data))
      .catch(() => message.error("Không lấy được danh sách món!"));
  }, []);

  const filteredProducts = products.filter((product) => {
    const productName = removeAccents(product.name);
    const searchKeyword = removeAccents(searchText).trim();
    return productName.includes(searchKeyword);
  });

  const getSizeExtraPrice = (size) => {
    if (size === 'S') return 0;
    if (size === 'M') return 5000;
    if (size === 'L') return 10000;
    return 0;
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const deleteFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const openEditModal = (item) => {
    setOptionModal({ open: true, product: item, editMode: true, cartItemId: item.cartItemId });
    optionForm.setFieldsValue({
      size: item.options?.size,
      topping: item.options?.toppings,
      sugar: item.options?.sugar,
      ice: item.options?.ice,
      note: item.note
    });
  };

  const handleOrder = () => {
    if (cart.length === 0) return message.warning("Chưa chọn món!");
    const orderID = "CFS" + Date.now().toString().slice(-8);
    const items = cart.map(item => ({
      id_product: item._id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      options: item.options || {},
      note: item.note || ""
    }));
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderData = {
      orderID,
      items,
      totalPrice,
      location: "Tại quầy",
      paymentMethod: "Tiền mặt",
    };
    axiosClient.post("/orders", orderData)
      .then(() => {
        message.success("Đặt món thành công!");
        setCart([]);
      })
      .catch(() => message.error("Đặt món thất bại!"));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="pos-container animated-fade-in">
      <Row gutter={[24, 24]} style={{ height: 'calc(100vh - 120px)' }}>
        {/* ── LEFT: PRODUCT MENU ── */}
        <Col xs={24} lg={15} xl={17} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="modern-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="pos-icon-header">☕</div>
                <div>
                  <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Thực đơn Bán hàng</Title>
                  <Text type="secondary">Chọn món nhanh chóng cho khách hàng</Text>
                </div>
              </div>
              <Input 
                placeholder="Tìm món nhanh (tên)..." 
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} 
                size="large"
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 320, borderRadius: 12, background: '#f8fafc' }}
                allowClear
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              <Row gutter={[16, 16]}>
                {filteredProducts.map(product => (
                  <Col xs={12} sm={8} md={6} xl={4.8} key={product._id}>
                    <Card
                      hoverable
                      className="pos-product-card"
                      cover={
                        <div style={{ position: 'relative', overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                          <img
                            alt={product.name}
                            src={product.image ? `${API_URL}/images/${product.image}` : "https://via.placeholder.com/150"}
                            style={{ height: 140, width: '100%', objectFit: "cover", transition: 'transform 0.5s ease' }}
                            className="product-img"
                          />
                          <div className="price-overlay">
                            {product.price?.toLocaleString()}đ
                          </div>
                        </div>
                      }
                      onClick={() => {
                        optionForm.resetFields();
                        setOptionModal({ open: true, product, editMode: false });
                      }}
                    >
                      <Text strong className="product-title">{product.name}</Text>
                      <div className="product-footer">
                        <Tag color="blue" style={{ border: 'none', background: '#eff6ff', color: '#3b82f6', borderRadius: 6, fontSize: 10 }}>{product.category?.name || "Drink"}</Tag>
                        <Button type="primary" shape="circle" icon={<PlusOutlined />} size="small" />
                      </div>
                    </Card>
                  </Col>
                ))}
                {filteredProducts.length === 0 && <Col span={24}><Empty description="Không tìm thấy món nào..." /></Col>}
              </Row>
            </div>
          </div>
        </Col>

        {/* ── RIGHT: CART ── */}
        <Col xs={24} lg={9} xl={7} style={{ height: '100%' }}>
          <div className="modern-card cart-container">
            <div className="cart-header">
              <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#f0f9ff', padding: '8px', borderRadius: 10 }}><ShoppingCartOutlined style={{ color: '#0369a1' }} /></div>
                Đơn hàng hiện tại
              </Title>
              <Tag color="blue" style={{ borderRadius: 12, fontWeight: 700 }}>{cart.length} món</Tag>
            </div>

            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.cartItemId} className="cart-item">
                  <img 
                    src={item.image ? `${API_URL}/images/${item.image}` : "https://via.placeholder.com/50"} 
                    className="cart-item-img"
                    alt={item.name}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong style={{ fontSize: 14, color: '#1e293b' }}>{item.name}</Text>
                      <Text strong style={{ color: '#059669' }}>{(item.price * item.quantity).toLocaleString()}đ</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.options?.size} • {item.options?.sugar} đường • {item.options?.ice} đá
                    </Text>
                    
                    {item.options?.toppings?.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.options.toppings.map(t => <span key={t} className="mini-tag">{t}</span>)}
                      </div>
                    )}

                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <Button size="small" type="text" icon={<MinusOutlined />} onClick={() => updateQuantity(item.cartItemId, -1)} />
                        <Text strong style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                        <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => updateQuantity(item.cartItemId, 1)} />
                      </div>
                      <Space>
                        <Button type="text" size="small" className="action-btn" icon={<EditOutlined />} onClick={() => openEditModal(item)} />
                        <Button type="text" danger size="small" className="action-btn" icon={<DeleteOutlined />} onClick={() => deleteFromCart(item.cartItemId)} />
                      </Space>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: 100, opacity: 0.5 }}>
                  <ShoppingCartOutlined style={{ fontSize: 48, color: '#94a3b8' }} />
                  <p style={{ marginTop: 16 }}>Giỏ hàng đang trống</p>
                </div>
              )}
            </div>

            <div className="cart-footer">
              <Divider style={{ margin: '0 0 20px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 16, color: '#64748b' }}>Tổng cộng:</Text>
                <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>{totalAmount.toLocaleString()}₫</Title>
              </div>
              <Button 
                type="primary" 
                block 
                size="large" 
                onClick={handleOrder} 
                className="checkout-btn"
                disabled={cart.length === 0}
              >
                XÁC NHẬN & THANH TOÁN
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      <Modal
        open={optionModal.open}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🥤</div>
            <div>
              <Text strong style={{ fontSize: 18, color: '#1e293b' }}>{optionModal.product?.name}</Text>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>Tùy chỉnh món theo yêu cầu khách hàng</div>
            </div>
          </div>
        }
        onCancel={() => setOptionModal({ open: false, product: null })}
        onOk={() => {
          optionForm.validateFields().then(values => {
            const { size, topping, sugar, ice, note } = values;
            const product = optionModal.product;
            const finalPrice = product.price + getSizeExtraPrice(size);
            
            if (optionModal.editMode) {
              setCart(prev => prev.map(item => 
                item.cartItemId === optionModal.cartItemId 
                  ? { ...item, options: { size, toppings: topping || [], sugar, ice }, note, price: finalPrice }
                  : item
              ));
            } else {
              setCart(prev => [...prev, {
                ...product,
                cartItemId: Date.now() + Math.random().toString(),
                quantity: 1,
                options: { size, toppings: topping || [], sugar, ice },
                note,
                price: finalPrice
              }]);
            }
            setOptionModal({ open: false, product: null });
            optionForm.resetFields();
          });
        }}
        okText={optionModal.editMode ? "Cập nhật đơn" : "Thêm vào giỏ hàng"}
        okButtonProps={{ size: 'large', style: { borderRadius: 10, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { borderRadius: 10 } }}
        width={500}
        centered
        destroyOnClose
      >
        <Form form={optionForm} layout="vertical" initialValues={{ sugar: "100%", ice: "100%", size: "S" }} style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="size" label={<Text strong>Kích cỡ (Size)</Text>} rules={[{ required: true }]}>
                <Select size="large" style={{ width: '100%' }} options={optionModal.product?.sizes?.map(s => ({ label: `Size ${s} (+${getSizeExtraPrice(s).toLocaleString()}đ)`, value: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sugar" label={<Text strong>Mức đường</Text>}>
                <Select size="large" options={optionModal.product?.sugarOptions?.map(s => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ice" label={<Text strong>Mức đá</Text>}>
                <Select size="large" options={optionModal.product?.iceOptions?.map(s => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="topping" label={<Text strong>Chọn thêm Toppings</Text>}>
            <Checkbox.Group style={{ width: '100%', padding: '12px', background: '#f8fafc', borderRadius: 12 }}>
              <Row>
                {optionModal.product?.toppings?.map(t => (
                  <Col span={8} key={t} style={{ marginBottom: 8 }}>
                    <Checkbox value={t}>{t}</Checkbox>
                  </Col>
                ))}
                {(!optionModal.product?.toppings || optionModal.product.toppings.length === 0) && (
                  <Col span={24}><Text type="secondary" italic>Món này không có topping kèm theo</Text></Col>
                )}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="note" label={<Text strong>Ghi chú phục vụ</Text>}>
            <Input.TextArea rows={3} placeholder="Ví dụ: Ít sữa, không lấy muỗng nhựa..." style={{ borderRadius: 10 }} />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .pos-container { height: 100%; }
        .pos-icon-header {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #1677ff 0%, #0369a1 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 4px 12px rgba(22, 119, 255, 0.2);
          color: #fff; line-height: 44px; text-align: center;
        }
        .pos-product-card {
          border-radius: 16px !important;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          border: 1px solid #f1f5f9 !important;
        }
        .pos-product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
          border-color: #1677ff !important;
        }
        .pos-product-card:hover .product-img { transform: scale(1.1); }
        .price-overlay {
          position: absolute; bottom: 8px; right: 8px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(4px);
          color: #fff; padding: 4px 8px;
          border-radius: 8px; font-weight: 700; font-size: 12px;
        }
        .product-title {
          display: block; font-size: 14px !important; margin-bottom: 8px;
          color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .product-footer { display: flex; justify-content: space-between; align-items: center; }
        
        .cart-container {
          height: 100%; display: flex; flex-direction: column;
          padding: 0 !important; overflow: hidden;
        }
        .cart-header {
          padding: 24px; border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .cart-items-list {
          flex: 1; overflow-y: auto; padding: 24px;
        }
        .cart-item {
          display: flex; gap: 12px; margin-bottom: 20px;
          padding-bottom: 20px; border-bottom: 1px dashed #f1f5f9;
        }
        .cart-item-img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: #f1f5f9; }
        .cart-item-actions {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 12px;
        }
        .qty-control {
          display: flex; align-items: center; gap: 8px;
          background: #f8fafc; border-radius: 8px; padding: 2px;
        }
        .mini-tag {
          font-size: 9px; padding: 2px 6px; background: #f1f5f9;
          border-radius: 4px; color: #64748b; font-weight: 600;
        }
        .cart-footer { padding: 24px; background: #fff; }
        .checkout-btn {
          height: 56px !important; border-radius: 14px !important;
          font-weight: 800 !important; font-size: 16px !important;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #1677ff 0%, #0369a1 100%) !important;
          border: none !important;
        }
        .action-btn:hover { background: #f1f5f9 !important; border-radius: 6px; }
      `}</style>
    </div>
  );
};

export default POSPage;