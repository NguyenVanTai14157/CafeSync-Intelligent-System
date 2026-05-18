import React, { useEffect, useState } from "react";
import axiosClient from "../services/axiosClient";
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
    const orderID = "CFS" + Date.now().toString().slice(-8); // Unified prefix
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
    <div style={{ padding: '0 8px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space split={<Divider type="vertical" />}>
                <Title level={4} style={{ margin: 0 }}>Menu Sản phẩm</Title>
                <Input 
                  placeholder="Tìm món..." 
                  prefix={<SearchOutlined />} 
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
              </Space>
            }
            bordered={false}
          >
            <Row gutter={[16, 16]}>
              {filteredProducts.map(product => (
                <Col xs={12} sm={8} md={6} key={product._id}>
                  <Card
                    hoverable
                    cover={
                      <img
                        alt={product.name}
                        src={product.image ? `https://cafesync-intelligent-system-sntf.onrender.com/images/${product.image}` : "https://via.placeholder.com/150"}
                        style={{ height: 120, objectFit: "cover" }}
                      />
                    }
                    bodyStyle={{ padding: '12px' }}
                    onClick={() => {
                      optionForm.resetFields();
                      setOptionModal({ open: true, product, editMode: false });
                    }}
                  >
                    <Card.Meta 
                      title={<Text strong style={{ fontSize: 13 }}>{product.name}</Text>} 
                      description={<Text type="danger" strong>{product.price?.toLocaleString()}đ</Text>} 
                    />
                    <Button 
                      type="primary" 
                      shape="circle" 
                      icon={<PlusOutlined />} 
                      size="small"
                      style={{ position: 'absolute', right: 8, bottom: 8 }}
                    />
                  </Card>
                </Col>
              ))}
              {filteredProducts.length === 0 && <Col span={24}><Empty /></Col>}
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={<Title level={4} style={{ margin: 0 }}><ShoppingCartOutlined /> Giỏ hàng</Title>}
            bodyStyle={{ padding: 0 }}
            bordered={false}
            actions={[
              <div style={{ padding: '0 24px', textAlign: 'right' }}>
                <Title level={3} type="danger" style={{ margin: 0 }}>{totalAmount.toLocaleString()}đ</Title>
                <Button type="primary" block size="large" onClick={handleOrder} style={{ marginTop: 12, height: 48, fontWeight: 'bold' }}>
                  XÁC NHẬN THANH TOÁN
                </Button>
              </div>
            ]}
          >
            <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '12px 24px' }}>
              {cart.map((item) => (
                <div key={item.cartItemId} style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                  <img 
                    src={item.image ? `https://cafesync-intelligent-system-sntf.onrender.com/images/${item.image}` : "https://via.placeholder.com/50"} 
                    style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }}
                    alt={item.name}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 14 }}>{item.name}</Text>
                      <Text strong>{(item.price * item.quantity).toLocaleString()}đ</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      Size {item.options?.size} | {item.options?.sugar} đường | {item.options?.ice} đá
                    </Text>
                    {item.options?.toppings?.length > 0 && (
                      <div style={{ marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.options.toppings.map(t => <Tag key={t} color="blue" style={{ fontSize: 9, margin: 0 }}>{t}</Tag>)}
                      </div>
                    )}
                    {item.note && (
                      <Text type="warning" style={{ fontSize: 10, fontStyle: 'italic', display: 'block', marginTop: 4 }}>
                         📝 Ghi chú: {item.note}
                      </Text>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Space size="small">
                        <Button size="small" icon={<MinusOutlined />} onClick={() => updateQuantity(item.cartItemId, -1)} />
                        <Text strong>{item.quantity}</Text>
                        <Button size="small" icon={<PlusOutlined />} onClick={() => updateQuantity(item.cartItemId, 1)} />
                      </Space>
                      <Space size="small">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(item)} />
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => deleteFromCart(item.cartItemId)} />
                      </Space>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <Empty description="Giỏ hàng trống" style={{ margin: '40px 0' }} />}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        open={optionModal.open}
        title={<Text strong style={{ fontSize: 18 }}>{optionModal.product?.name}</Text>}
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
        okText={optionModal.editMode ? "Cập nhật" : "Thêm vào giỏ"}
        destroyOnClose
      >
        <Form form={optionForm} layout="vertical" initialValues={{ sugar: "100%", ice: "100%", size: "S" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="size" label="Kích cỡ" rules={[{ required: true }]}>
                <Select options={optionModal.product?.sizes?.map(s => ({ label: `${s} (+${getSizeExtraPrice(s).toLocaleString()}đ)`, value: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sugar" label="Mức đường">
                <Select options={optionModal.product?.sugarOptions?.map(s => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ice" label="Mức đá">
                <Select options={optionModal.product?.iceOptions?.map(s => ({ label: s, value: s }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="topping" label="Toppings">
            <Checkbox.Group style={{ width: '100%' }}>
              <Row>
                {optionModal.product?.toppings?.map(t => (
                  <Col span={8} key={t} style={{ marginBottom: 8 }}>
                    <Checkbox value={t}>{t}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea placeholder="Ghi chú thêm cho món này..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default POSPage;