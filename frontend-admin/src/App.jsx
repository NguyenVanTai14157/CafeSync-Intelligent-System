import LoginPage from "./pages/LoginPage";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import AdminLayout from "./layouts/AdminLayout";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import UserManagementPage from "./pages/User";
import IngredientManagementPage from "./pages/IngredientManagementPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import RevenueReportPage from "./pages/RevenueReportPage";
import POSPage from "./pages/POSPage"; // 👈 Import trang POS mới của Yến
import ProfilePage from "./pages/ProfilePage";
import TableManagementPage from "./pages/TableManagementPage";

function App() {
  return (
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
                  <Route path="/ingredients" element={<RequireAdmin><IngredientManagementPage /></RequireAdmin>} />
                  <Route path="/reports" element={<RequireAdmin><RevenueReportPage /></RequireAdmin>} />
                </Routes>
              </AdminLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;