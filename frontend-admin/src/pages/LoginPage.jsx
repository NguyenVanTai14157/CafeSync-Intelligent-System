import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";

const { Title } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/api/auth/login`,
        values
      );

      const { token, user } = res.data;

      // Nếu là customer, không cho vào trang Admin mà điều hướng thẳng sang trang Client
      if (user.role === "customer") {
        message.info("Tài khoản khách hàng. Đang chuyển sang trang Khách hàng...");
        setTimeout(() => {
          window.location.href = "http://localhost:3001";
        }, 1000);
        return;
      }

      // 🔐 lưu auth chuẩn hơn
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      message.success("Đăng nhập thành công!");

      // ⬅ điều hướng mượt hơn
      navigate("/");
    } catch (err) {
      message.error(
        err?.response?.data?.message || "Sai tài khoản hoặc mật khẩu!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <Card style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: "#1677ff" }}>
            Đăng nhập hệ thống
          </Title>
        </div>

        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input size="large" placeholder="example@email.com" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu!" }]}
          >
            <Input.Password size="large" placeholder="password..." />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #e0e7ff, #f0fdfa)",
  },
  card: {
    width: 420,
    borderRadius: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
  },
};

export default LoginPage;