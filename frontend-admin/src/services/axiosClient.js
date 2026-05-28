import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://cafesync-intelligent-system-sntf.onrender.com/api", // đổi nếu backend khác port
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;