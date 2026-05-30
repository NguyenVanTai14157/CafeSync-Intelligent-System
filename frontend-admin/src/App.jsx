import { ConfigProvider, theme } from "antd";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import AdminLayout from "./layouts/AdminLayout";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import UserManagementPage from "./pages/User";
import OrderManagementPage from "./pages/OrderManagementPage";
import RevenueReportPage from "./pages/RevenueReportPage";
import POSPage from "./pages/POSPage";
import ProfilePage from "./pages/ProfilePage";
import TableManagementPage from "./pages/TableManagementPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ⚡ Cấu hình React Query - Cache 60s, giữ data 5 phút
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // Data "tươi" trong 60s, không gọi API lại
      gcTime: 5 * 60 * 1000,       // Giữ cache 5 phút kể cả khi rời trang
      refetchOnWindowFocus: true,   // Tự cập nhật khi quay lại tab
      retry: 1,                     // Thử lại 1 lần nếu lỗi
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 12,
          fontFamily: "'Inter', sans-serif",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f1f5f9",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        },
        components: {
          Button: {
            borderRadius: 8,
            controlHeight: 40,
            fontWeight: 500,
          },
          Table: {
            borderRadius: 12,
            headerBg: "rgba(250, 250, 250, 0.5)",
            headerColor: "#475569",
          },
          Card: {
            borderRadiusLG: 16,
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "rgba(22, 119, 255, 0.1)",
            itemActiveBg: "rgba(22, 119, 255, 0.05)",
          }
        }
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <RequireAuth>
                <AdminLayout>
                  <Routes>
                    {/* --- CHỨC NĂNG DÙNG CHUNG --- */}
                    <Route path="/" element={<WelcomePage />} />
                    <Route path="/orders" element={<OrderManagementPage />} />
                    <Route path="/tables" element={<TableManagementPage />} />
                    <Route path="/pos" element={<POSPage />} /> {/* 👈 Route cho Nhân viên/POS */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* --- CHỨC NĂNG CHỈ ADMIN --- */}
                    <Route path="/CategoryPage" element={<RequireAdmin><CategoryPage /></RequireAdmin>} />
                    <Route path="/users" element={<RequireAdmin><UserManagementPage /></RequireAdmin>} />
                    <Route path="/products" element={<RequireAdmin><ProductPage /></RequireAdmin>} />
                    <Route path="/reports" element={<RequireAdmin><RevenueReportPage /></RequireAdmin>} />
                  </Routes>
                </AdminLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
    </QueryClientProvider>
  );
}


export default App;