import axiosClient from "../services/axiosClient";

// lấy sản phẩm theo category
export const getProductsByCategory = async (categoryId) => {
  const res = await axiosClient.get(`/products?category=${categoryId}`);
  return res.data;
};

import axios from "axios";

import API_URL from "../config";

const API = `${API_URL}/api/products`;

// lấy danh sách món
export const getProducts = () => axios.get(API);

// thêm món
export const createProduct = (data) => axios.post(API, data);

// update món
export const updateProduct = (id, data) =>
  axios.put(`${API}/${id}`, data);

// xóa món
export const deleteProduct = (id) =>
  axios.delete(`${API}/${id}`);

// upload ảnh
export const uploadImages = (formData) =>
  axios.post(`${API}/upload`, formData);