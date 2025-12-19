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
import BranchStock from "./pages/Shops/BranchStock";
import Billing from "./pages/Shops/Billing";
import SalesReport from "./pages/Shops/SalesReport";
import SalesReturn from "./pages/Shops/SalesReturn";
import ShopExpense from "./pages/Shops/ShopExpense";
import Categorization from "./pages/Warehouse/Categorization";
import ShopTransfer from "./pages/Shops/ShopTransfer";
import TestConnection from "./pages/TestConnection";
import PrintBarcodes from "./pages/PrintBarcodes";


export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
                <Toaster position="top-right" />
        <Routes>
          {/* Print Page - Outside Layout (standalone) */}
          <Route path="/print-barcodes" element={<PrintBarcodes />} />

          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />

            {/* Warehouse */}
            <Route path="/warehouse/stock-in" element={<StockIn />} />
            <Route path="/warehouse/tagging" element={<Tagging />} />
            <Route path="/warehouse/categorization" element={<Categorization />} />
            <Route path="/warehouse/distribution" element={<Distribution />} />
            <Route path="/warehouse/reports" element={<WarehouseReports />} />
            <Route path="/warehouse/returns" element={<Returns />} />
            

            <Route path="/test-connection" element={<TestConnection />} />
            {/* Shops */}
            <Route path="/shops/branch-stock" element={<BranchStock />} />
            <Route path="/shops/billing" element={<Billing />} />
            <Route path="/shops/sales-report" element={<SalesReport />} />
            <Route path="/shops/sales-return" element={<SalesReturn />} />
            <Route path="/shops/shop-expense" element={<ShopExpense />} />
            <Route path="/shops/shop-transfer" element={<ShopTransfer />} />





            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
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

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
