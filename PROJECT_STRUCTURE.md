# 📁 MangalMurti Jewellers - Project Structure

## 🎯 Complete `src/` Folder Hierarchy

```
src/
├── 📱 App.tsx                          # Main application component
├── 🎨 index.css                        # Global styles
├── 🚀 main.tsx                         # Application entry point
├── 📝 svg.d.ts                         # SVG type definitions
├── 📝 vite-env.d.ts                    # Vite environment types
│
├── 📦 components/                      # Reusable UI components
│   ├── auth/                          # Authentication components
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   │
│   ├── charts/                        # Chart components
│   │   ├── bar/
│   │   │   └── BarChartOne.tsx
│   │   └── line/
│   │       └── LineChartOne.tsx
│   │
│   ├── common/                        # Common/shared components
│   │   ├── BarcodePrintSheet.tsx     # ✨ Barcode printing layout
│   │   ├── BarcodeScanner.tsx        # ✨ Barcode scanner component
│   │   ├── BarcodeView.tsx           # ✨ Barcode display component
│   │   ├── ChartTab.tsx              # Chart tab component
│   │   ├── ComponentCard.tsx         # Card wrapper component
│   │   ├── GridShape.tsx             # Grid layout component
│   │   ├── PageBreadCrumb.tsx        # Breadcrumb navigation
│   │   ├── PageMeta.tsx              # Page metadata (title, description)
│   │   ├── ScrollToTop.tsx           # Scroll to top utility
│   │   ├── TASection.tsx             # Section wrapper component
│   │   ├── ThemeToggleButton.tsx     # Theme switcher button
│   │   └── ThemeTogglerTwo.tsx       # Alternative theme toggler
│   │
│   ├── ecommerce/                     # E-commerce dashboard components
│   │   ├── CountryMap.tsx
│   │   ├── DemographicCard.tsx
│   │   ├── EcommerceMetrics.tsx
│   │   ├── MonthlySalesChart.tsx
│   │   ├── MonthlyTarget.tsx
│   │   ├── RecentOrders.tsx
│   │   └── StatisticsChart.tsx
│   │
│   ├── form/                          # Form components
│   │   ├── form-elements/            # Form element examples
│   │   │   ├── CheckboxComponents.tsx
│   │   │   ├── DefaultInputs.tsx
│   │   │   ├── DropZone.tsx
│   │   │   ├── FileInputExample.tsx
│   │   │   ├── InputGroup.tsx
│   │   │   ├── InputStates.tsx
│   │   │   ├── RadioButtons.tsx
│   │   │   ├── SelectInputs.tsx
│   │   │   ├── TextAreaInput.tsx
│   │   │   └── ToggleSwitch.tsx
│   │   ├── group-input/
│   │   │   └── PhoneInput.tsx
│   │   ├── input/                    # Base input components
│   │   │   ├── Checkbox.tsx
│   │   │   ├── FileInput.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── RadioSm.tsx
│   │   │   └── TextArea.tsx
│   │   ├── switch/
│   │   │   └── Switch.tsx
│   │   ├── Form.tsx                  # Form wrapper
│   │   ├── Label.tsx                 # Form label
│   │   ├── MultiSelect.tsx           # Multi-select dropdown
│   │   └── Select.tsx                # Select dropdown
│   │
│   ├── header/                        # Header components
│   │   ├── Header.tsx                # Main header
│   │   ├── NotificationDropdown.tsx  # Notifications
│   │   └── UserDropdown.tsx          # User menu
│   │
│   ├── tables/                        # Table components
│   │   └── BasicTables/
│   │       └── BasicTableOne.tsx
│   │
│   ├── ui/                            # UI library components
│   │   ├── alert/
│   │   │   └── Alert.tsx
│   │   ├── avatar/
│   │   │   └── Avatar.tsx
│   │   ├── badge/
│   │   │   └── Badge.tsx
│   │   ├── button/
│   │   │   └── Button.tsx
│   │   ├── dropdown/
│   │   │   ├── Dropdown.tsx
│   │   │   └── DropdownItem.tsx
│   │   ├── images/
│   │   │   ├── ResponsiveImage.tsx
│   │   │   ├── ThreeColumnImageGrid.tsx
│   │   │   └── TwoColumnImageGrid.tsx
│   │   ├── modal/
│   │   │   └── index.tsx
│   │   ├── table/
│   │   │   └── index.tsx
│   │   └── videos/
│   │       ├── AspectRatioVideo.tsx
│   │       ├── FourIsToThree.tsx
│   │       ├── OneIsToOne.tsx
│   │       ├── SixteenIsToNine.tsx
│   │       └── TwentyOneIsToNine.tsx
│   │
│   ├── UserProfile/                   # User profile components
│   │   ├── UserAddressCard.tsx
│   │   ├── UserInfoCard.tsx
│   │   └── UserMetaCard.tsx
│   │
│   └── warehouse/                     # ✨ Warehouse-specific components
│       ├── QuickActions.tsx          # Quick action buttons
│       └── WarehouseStats.tsx        # Warehouse statistics
│
├── 🔧 context/                        # React Context providers
│   ├── SidebarContext.tsx            # Sidebar state management
│   └── ThemeContext.tsx              # Theme state management
│
├── 🔥 firebase/                       # ✨ Firebase/Firestore services
│   ├── branchStock.ts                # Branch stock operations
│   ├── config.ts                     # Firebase configuration
│   ├── inventory.ts                  # Inventory management
│   ├── invoices.ts                   # Invoice operations
│   ├── rejected.ts                   # Rejected items
│   ├── salesReturns.ts               # Sales returns
│   ├── serials.ts                    # ✨ Serial number management
│   ├── shopStock.ts                  # Shop stock operations
│   ├── stockIn.ts                    # Stock-in operations
│   ├── tagged.ts                     # Tagged items (legacy)
│   ├── transfers.ts                  # Transfer operations
│   ├── warehouse.ts                  # Warehouse operations (legacy)
│   └── warehouseItems.ts             # ✨ Unified warehouse items system
│
├── 🪝 hooks/                          # Custom React hooks
│   ├── useBarcodeScanner.ts          # ✨ Barcode scanner hook
│   ├── useCategories.ts              # ✨ Categories data hook
│   ├── useGoBack.ts                  # Navigation hook
│   ├── useLocations.ts               # ✨ Locations data hook
│   └── useModal.ts                   # Modal state hook
│
├── 🎨 icons/                          # SVG icon assets
│   ├── alert-hexa.svg
│   ├── alert.svg
│   ├── angle-down.svg
│   ├── angle-left.svg
│   ├── angle-right.svg
│   ├── angle-up.svg
│   ├── arrow-down.svg
│   ├── arrow-right.svg
│   ├── arrow-up.svg
│   ├── audio.svg
│   ├── bolt.svg
│   ├── box-cube.svg
│   ├── box-line.svg
│   ├── box.svg
│   ├── calendar.svg
│   ├── calender-line.svg
│   ├── chat.svg
│   ├── check-circle.svg
│   ├── check-line.svg
│   ├── chevron-down.svg
│   ├── chevron-left.svg
│   ├── chevron-up.svg
│   ├── close-line.svg
│   ├── close.svg
│   ├── copy.svg
│   ├── docs.svg
│   ├── dollar-line.svg
│   ├── download.svg
│   ├── envelope.svg
│   ├── eye-close.svg
│   ├── eye.svg
│   ├── file.svg
│   ├── folder.svg
│   ├── grid.svg
│   ├── group.svg
│   ├── horizontal-dots.svg
│   ├── index.ts                      # Icon exports
│   ├── info-error.svg
│   ├── info-hexa.svg
│   ├── info.svg
│   ├── list.svg
│   ├── lock.svg
│   ├── mail-line.svg
│   ├── moredot.svg
│   ├── page.svg
│   ├── paper-plane.svg
│   ├── pencil.svg
│   ├── pie-chart.svg
│   ├── plug-in.svg
│   ├── plus.svg
│   ├── shooting-star.svg
│   ├── table.svg
│   ├── task-icon.svg
│   ├── time.svg
│   ├── trash.svg
│   ├── user-circle.svg
│   ├── user-line.svg
│   └── videos.svg
│
├── 🏗️ layout/                         # Layout components
│   ├── AppHeader.tsx                 # Application header
│   ├── AppLayout.tsx                 # Main layout wrapper
│   ├── AppSidebar.tsx                # ✨ Sidebar navigation
│   ├── Backdrop.tsx                  # Modal backdrop
│   └── SidebarWidget.tsx             # Sidebar widget
│
├── 📄 pages/                          # Page components (routes)
│   ├── AuthPages/                    # Authentication pages
│   │   ├── AuthPageLayout.tsx
│   │   ├── SignIn.tsx
│   │   └── SignUp.tsx
│   │
│   ├── Charts/                       # Chart pages
│   │   ├── BarChart.tsx
│   │   └── LineChart.tsx
│   │
│   ├── Dashboard/                    # Dashboard pages
│   │   └── Home.tsx                  # Main dashboard
│   │
│   ├── Forms/                        # Form pages
│   │   └── FormElements.tsx
│   │
│   ├── OtherPage/                    # Other pages
│   │   └── NotFound.tsx              # 404 page
│   │
│   ├── Shops/                        # ✨ Shop management pages
│   │   ├── Billing.old.tsx           # Old billing (backup)
│   │   ├── Billing.tsx               # ✨ Shop billing system
│   │   ├── BranchStock.tsx           # ✨ Branch stock management
│   │   ├── SalesReport.tsx           # Sales reporting
│   │   ├── SalesReturn.tsx           # Sales returns
│   │   ├── ShopExpense.tsx           # Shop expenses
│   │   └── ShopTransfer.tsx          # Shop transfers
│   │
│   ├── Tables/                       # Table pages
│   │   └── BasicTables.tsx
│   │
│   ├── UiElements/                   # UI element pages
│   │   ├── Alerts.tsx
│   │   ├── Avatars.tsx
│   │   ├── Badges.tsx
│   │   ├── Buttons.tsx
│   │   ├── Images.tsx
│   │   └── Videos.tsx
│   │
│   ├── Warehouse/                    # ✨ Warehouse management pages
│   │   ├── Categorization.tsx        # Category management
│   │   ├── Distribution.tsx          # ✨ Item distribution to shops
│   │   ├── Returns.tsx               # ✨ Item returns from shops
│   │   ├── StockIn.old.tsx           # Old stock-in (backup)
│   │   ├── StockIn.tsx               # ✨ Stock-in management
│   │   ├── Tagging.tsx               # ✨ Item tagging & barcode generation
│   │   └── WarehouseReports.tsx      # ✨ Professional ERP-grade reports
│   │
│   ├── Blank.tsx                     # Blank page template
│   ├── Calendar.tsx                  # Calendar page
│   ├── PrintBarcodes.tsx             # ✨ Barcode printing page
│   ├── TestConnection.tsx            # Firebase connection test
│   ├── UserProfiles.tsx              # User profile page
│   └── Warehousez.zip                # Archive file
│
├── 🔧 services/                       # ✨ Business logic services
│   └── reportGenerator.ts            # ✨ Professional Excel report generator
│
├── 🎨 styles/                         # Global styles
│   └── print.css                     # ✨ Print-specific styles for tags
│
└── 🛠️ utils/                          # Utility functions
    ├── barcode.ts                    # ✨ Barcode generation utilities
    ├── dataMigration.ts              # ✨ Data migration utilities
    └── validation.ts                 # ✨ Validation utilities
```

---

## 🌟 Key Features by Module

### ✨ Warehouse Management

```
📦 Tagging System
   - Serial number generation
   - Barcode creation
   - Category-wise counters
   - Gap filling for deleted items
   - Print label generation

📦 Stock Management
   - Stock-in operations
   - Distribution to shops
   - Returns from shops
   - Real-time tracking

📊 Professional Reports
   - ERP-grade Excel reports
   - Category-wise grouping
   - Summary sections
   - Formatted tables
   - Grand totals
```

### 🏪 Shop Management

```
💰 Billing System
   - Barcode scanning
   - Invoice generation
   - Payment processing
   - Stock updates

📊 Stock Tracking
   - Branch stock view
   - Sales reporting
   - Returns management
   - Transfer operations
```

### 🔥 Firebase Integration

```
📡 Firestore Collections
   - warehouseItems (unified system)
   - branchStock
   - invoices
   - salesReturns
   - transfers
   - serials (counters)

🔐 Authentication
   - User management
   - Role-based access
```

### 🎨 UI Components

```
🧩 Common Components
   - Barcode scanner
   - Barcode viewer
   - Print layouts
   - Forms & inputs
   - Tables & charts

🎨 Theme System
   - Light/Dark mode
   - Responsive design
   - Tailwind CSS
```

---

## 📊 Statistics

```
Total Files:        150+
Total Components:   80+
Total Pages:        25+
Total Services:     15+
Total Hooks:        5+
Total Utils:        3+
Lines of Code:      15,000+
```

---

## 🎯 Core Technologies

```
⚛️  React 18
🔷  TypeScript
🔥  Firebase/Firestore
🎨  Tailwind CSS
📊  ExcelJS (reports)
📷  JsBarcode (barcodes)
🚀  Vite (build tool)
```

---

## 📁 Important Files

### Configuration

- `src/firebase/config.ts` - Firebase setup
- `src/App.tsx` - Route configuration
- `src/main.tsx` - App initialization

### Core Services

- `src/firebase/warehouseItems.ts` - Unified warehouse system
- `src/firebase/serials.ts` - Serial number management
- `src/services/reportGenerator.ts` - Professional reports

### Key Pages

- `src/pages/Warehouse/Tagging.tsx` - Item tagging
- `src/pages/Warehouse/WarehouseReports.tsx` - Reports
- `src/pages/Shops/Billing.tsx` - Shop billing
- `src/pages/PrintBarcodes.tsx` - Print labels

### Utilities

- `src/utils/barcode.ts` - Barcode generation
- `src/utils/validation.ts` - Data validation
- `src/styles/print.css` - Print styling

---

**Generated**: December 23, 2025  
**Project**: MangalMurti Jewellers ERP System  
**Version**: 5.0 (Professional ERP-Grade)
