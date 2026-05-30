import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import axios from "axios";
import API_URL from "../config";

const { Title } = Typography;

const ProfilePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const onFinish = async (values) => {
    const hasOld = !!values.oldPassword;
    const hasNew = !!values.newPassword;
    const hasConfirm = !!values.confirmPassword;

    // Ngăn lưu và không gửi API nếu điền thiếu các phần liên quan đến đổi mật khẩu
    if (hasOld || hasNew || hasConfirm) {
      if (!hasOld) return message.error("Vui lòng nhập mật khẩu cũ để đổi mật khẩu!");
      if (!hasNew) return message.error("Vui lòng nhập mật khẩu mới!");
      if (!hasConfirm) return message.error("Vui lòng xác nhận mật khẩu mới!");
      if (values.newPassword !== values.confirmPassword) {
        return message.error("Mật khẩu xác nhận không trùng khớp!");
      }
    }

    setLoading(true);
    let hasError = false;
    let didUpdateInfo = false;
    const userId = currentUser._id || currentUser.id;
    
    // 1. Cập nhật thông tin cơ bản
    try {
      const res = await axios.put(`${API_URL}/api/users/${userId}`, {
        name: values.name,
        role: currentUser.role
      });
      
      const updatedUser = { ...currentUser, ...res.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      didUpdateInfo = true;
    } catch (err) {
      hasError = true;
      message.error(err?.response?.data?.message || "Cập nhật thông tin thất bại!");
    }

    // 2. Cập nhật mật khẩu nếu có nhập mật khẩu cũ/mới
    if (values.oldPassword && values.newPassword) {
      try {
        await axios.post(`${API_URL}/api/users/${userId}/change-password`, {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword
        });
        
        form.setFieldsValue({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } catch (err) {
        hasError = true;
        message.error(err?.response?.data?.message || "Đổi mật khẩu thất bại!");
      }
    } else if (values.newPassword && !values.oldPassword) {
       hasError = true;
       message.error("Vui lòng nhập mật khẩu cũ nếu bạn muốn đổi mật khẩu!");
    } else if (values.oldPassword && !values.newPassword) {
       hasError = true;
       message.error("Vui lòng nhập mật khẩu mới!");
    }

    if (!hasError) {
      message.success("Lưu thay đổi thành công!");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", marginTop: 24, paddingBottom: 24 }}>
      <Title level={3}>Chỉnh sửa thông tin cá nhân</Title>
      
      <Card style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          initialValues={{
            name: currentUser?.name,
          }}
        >
          <Typography.Title level={5}>Thông tin cơ bản</Typography.Title>
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input size="large" />
          </Form.Item>
          

          <Typography.Title level={5} style={{ marginTop: 24 }}>Đổi mật khẩu (Tuỳ chọn)</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Nhập mật khẩu cũ và mới nếu bạn muốn thay đổi mật khẩu. Nếu không, hãy để trống.
          </Typography.Text>
          
          <Form.Item
            label="Mật khẩu cũ"
            name="oldPassword"
          >
            <Input.Password size="large" />
          </Form.Item>
          
          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
          >
            <Input.Password size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ marginTop: 16 }}>
            Lưu tất cả thay đổi
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
