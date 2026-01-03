import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
// import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import StockIn from "./pages/Warehouse/StockIn";
import Tagging from "./pages/Warehouse/Tagging";
import Distribution from "./pages/Warehouse/Distribution";
import WarehouseReports from "./pages/Warehouse/WarehouseReports";
import Returns from "./pages/Warehouse/Returns";
import ReturnedItems from "./pages/Warehouse/ReturnedItems";
import BranchStock from "./pages/Shops/BranchStock";
import Billing from "./pages/Shops/Billing";
import SalesBooking from "./pages/Shops/SalesBooking";
import SalesReport from "./pages/Shops/SalesReport";
import SalesReturn from "./pages/Shops/SalesReturn";
import ReturnReport from "./pages/Shops/ReturnReport";
import ShopExpense from "./pages/Shops/ShopExpense";
import ShopExpenseReport from "./pages/Shops/ShopExpenseReport";
import ShopTransfer from "./pages/Shops/ShopTransfer";
import ShopTransferReport from "./pages/Shops/ShopTransferReport";
import CAReport from "./pages/Shops/CAReport";
import PrintBarcodes from "./pages/PrintBarcodes";
import AppSettingsPage from "./pages/Settings/AppSettings";
import { AuthProvider } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";


export default function App() {
  return (
    <AuthProvider>
      <ShopProvider>
        <Router>
          <ScrollToTop />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                zIndex: 99999,
                marginTop: '70px',
              },
              duration: 3000,
            }}
          />
          <Routes>
            {/* Public Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Print Page - Outside Layout but Protected */}
            <Route
              path="/print-barcodes"
              element={
                <ProtectedRoute>
                  <PrintBarcodes />
                </ProtectedRoute>
              }
            />

            {/* Protected Dashboard Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index path="/" element={<Home />} />

              {/* Warehouse */}
              <Route path="/warehouse/stock-in" element={<StockIn />} />
              <Route path="/warehouse/tagging" element={<Tagging />} />
              <Route path="/warehouse/distribution" element={<Distribution />} />
              <Route path="/warehouse/reports" element={<WarehouseReports />} />
              <Route path="/warehouse/returns" element={<Returns />} />
              <Route path="/warehouse/returned-items" element={<ReturnedItems />} />

              {/* Shops */}
              <Route path="/shops/branch-stock" element={<BranchStock />} />
              <Route path="/shops/billing" element={<Billing />} />
              <Route path="/shops/sale-booking" element={<SalesBooking />} />
              <Route path="/shops/sales-report" element={<SalesReport />} />
              <Route path="/shops/sales-return" element={<SalesReturn />} />
              <Route path="/shops/return-report" element={<ReturnReport />} />
              <Route path="/shops/shop-expense" element={<ShopExpense />} />
              <Route path="/shops/shop-expense-report" element={<ShopExpenseReport />} />
              <Route path="/shops/shop-transfer" element={<ShopTransfer />} />
              <Route path="/shops/shop-transfer-report" element={<ShopTransferReport />} />
              <Route path="/shops/ca-report" element={<CAReport />} />

              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/settings" element={<AppSettingsPage />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              {/* <Route path="/videos" element={<Videos />} /> */}

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>

            {/* Fallback Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ShopProvider>
    </AuthProvider>
  );
}
