import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Upload,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { getCategories } from "../api/categoryApi";
import { Select } from "antd";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
} from "../api/productApi";

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

const ProductPage = () => {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState("");

  // LOAD DATA
  const fetchData = async () => {
    const res = await getProducts();
    setProducts(res.data);
  };

  useEffect(() => {
    fetchData();
    getCategories().then(res => setCategories(Array.isArray(res) ? res : []));
  }, []);

  // OPEN MODAL
  const openModal = (item = null) => {
    setEditing(item);
    setOpen(true);

    if (item) {
      form.setFieldsValue({
        ...item,
        category: item.category?._id || item.category // lấy _id nếu là object, còn không thì lấy luôn
      });
    } else {
      form.resetFields();
      setFileList([]);
    }
  };

  // UPLOAD IMAGE
  const handleUpload = async () => {
    const formData = new FormData();

    fileList.forEach((file) => {
      formData.append("images", file.originFileObj);
    });

    const res = await uploadImages(formData);
    return res.data.imageUrls;
  };

  // SUBMIT
  const handleOk = async () => {
    const values = await form.validateFields();

    let imageUrls = [];

    if (fileList.length > 0) {
      imageUrls = await handleUpload();
    }

    const payload = {
      ...values,
      image: imageUrls[0] || editing?.image,
    };

    if (editing) {
      await updateProduct(editing._id, payload);
      message.success("Cập nhật món thành công");
    } else {
      await createProduct(payload);
      message.success("Thêm món thành công");
    }

    setOpen(false);
    fetchData();
  };

  // DELETE
  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Bạn có chắc muốn xóa món này?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        await deleteProduct(id);
        message.success("Xóa thành công");
        fetchData();
      },
    });
  };

  const columns = [
    {
      title: "Hình",
      dataIndex: "image",
      render: (img) => (
        <img
          src={`https://cafesync-intelligent-system-sntf.onrender.com/images/${img}`}
          style={{ width: 60, height: 60, objectFit: "cover" }}
        />
      ),
    },
    { title: "Tên món", dataIndex: "name" },
    { title: "Giá", dataIndex: "price" },
    {
      title: "Danh mục",
      dataIndex: "category",
      render: (cat) => cat?.name || ""
    },
    {
      title: "Thao tác",
      render: (_, record) => (
        <>
          <Button onClick={() => openModal(record)}>Sửa</Button>
          <Button danger onClick={() => handleDelete(record._id)}>
            Xóa
          </Button>
        </>
      ),
    },
  ];
  const filteredProducts = products.filter((product) => {
    const productName = removeAccents(product.name);
    const searchKeyword = removeAccents(searchText).trim();
    return productName.includes(searchKeyword);
  });

  return (
    <div>
      <h2>☕ Quản lý món uống</h2>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          Thêm món
        </Button>
        <Input.Search
          placeholder="Tìm kiếm món theo tên..."
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      <Table rowKey="_id" dataSource={filteredProducts} columns={columns} />

      {/* MODAL */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleOk}
        title={editing ? "Sửa món" : "Thêm món"}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên món"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="price"
            label="Giá"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select
              placeholder="Chọn danh mục"
              options={categories.map(cat => ({
                label: cat.name,
                value: cat._id
              }))}
            />
          </Form.Item>

          <Form.Item name="sizes" label="Size">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập hoặc chọn size, ví dụ: S, M, L"
              options={[
                { label: "S", value: "S" },
                { label: "M", value: "M" },
                { label: "L", value: "L" }
              ]}
            />
          </Form.Item>

          <Form.Item name="toppings" label="Topping">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập hoặc chọn topping"
              options={[
                { label: "Trân châu", value: "Trân châu" },
                { label: "Sữa", value: "Sữa" },
                { label: "Thạch", value: "Thạch" },
                { label: "Pudding", value: "Pudding" },
                { label: "Kem cheese", value: "Kem cheese" }
              ]}
            />
          </Form.Item>

          <Form.Item name="sugarOptions" label="Mức đường">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập hoặc chọn mức đường"
              options={[
                { label: "0%", value: "0%" },
                { label: "30%", value: "30%" },
                { label: "50%", value: "50%" },
                { label: "70%", value: "70%" },
                { label: "100%", value: "100%" }
              ]}
            />
          </Form.Item>

          <Form.Item name="iceOptions" label="Mức đá">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Nhập hoặc chọn mức đá"
              options={[
                { label: "0%", value: "0%" },
                { label: "30%", value: "30%" },
                { label: "50%", value: "50%" },
                { label: "70%", value: "70%" },
                { label: "100%", value: "100%" }
              ]}
            />
          </Form.Item>

          {/* UPLOAD */}
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList }) => setFileList(fileList)}
          >
            + Upload
          </Upload>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductPage;