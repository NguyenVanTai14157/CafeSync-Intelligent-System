import axios from "axios";

import API_URL from "../config";

const axiosClient = axios.create({
  baseURL: `${API_URL}/api`, // đổi nếu backend khác port
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;