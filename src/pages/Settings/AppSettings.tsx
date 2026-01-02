// src/pages/Settings/AppSettings.tsx - Application Settings Page
import { useState, useEffect } from "react";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import toast from "react-hot-toast";
import { Settings, Save, Percent, Building2, Phone, Mail, FileText } from "lucide-react";
import { getAppSettings, updateGSTSettings, updateCompanySettings, AppSettings } from "../../firebase/settings";

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // GST Settings
  const [cgst, setCgst] = useState(1.5);
  const [sgst, setSgst] = useState(1.5);
  const [igst, setIgst] = useState(3);
  const [defaultGSTType, setDefaultGSTType] = useState<"cgst_sgst" | "igst">("cgst_sgst");

  // Company Settings
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyGSTIN, setCompanyGSTIN] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const appSettings = await getAppSettings();
      setSettings(appSettings);

      // Set GST settings with fallback to defaults
      if (appSettings.gst) {
        setCgst(appSettings.gst.cgst || 1.5);
        setSgst(appSettings.gst.sgst || 1.5);
        setIgst(appSettings.gst.igst || 3);
        setDefaultGSTType(appSettings.gst.defaultType || "cgst_sgst");
      } else {
        // Use defaults if gst object doesn't exist
        setCgst(1.5);
        setSgst(1.5);
        setIgst(3);
        setDefaultGSTType("cgst_sgst");
      }

      // Set company settings
      setCompanyName(appSettings.companyName || "");
      setCompanyAddress(appSettings.companyAddress || "");
      setCompanyPhone(appSettings.companyPhone || "");
      setCompanyEmail(appSettings.companyEmail || "");
      setCompanyGSTIN(appSettings.companyGSTIN || "");
      setInvoicePrefix(appSettings.invoicePrefix || "INV");

      toast.success("Settings loaded");
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
      
      // Set defaults on error
      setCgst(1.5);
      setSgst(1.5);
      setIgst(3);
      setDefaultGSTType("cgst_sgst");
      setCompanyName("");
      setCompanyAddress("");
      setCompanyPhone("");
      setCompanyEmail("");
      setCompanyGSTIN("");
      setInvoicePrefix("INV");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGSTSettings = async () => {
    setSaving(true);
    try {
      await updateGSTSettings(
        {
          cgst,
          sgst,
          igst,
          defaultType: defaultGSTType,
        },
        "current-user" // TODO: Get from auth
      );
      toast.success("✅ GST settings saved!");
      await loadSettings();
    } catch (error) {
      console.error("Error saving GST settings:", error);
      toast.error("Failed to save GST settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    setSaving(true);
    try {
      await updateCompanySettings(
        {
          companyName,
          companyAddress,
          companyPhone,
          companyEmail,
          companyGSTIN,
          invoicePrefix,
        },
        "current-user" // TODO: Get from auth
      );
      toast.success("✅ Company settings saved!");
      await loadSettings();
    } catch (error) {
      console.error("Error saving company settings:", error);
      toast.error("Failed to save company settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-2">⏳</div>
        <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Application Settings" description="Configure application settings" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="⚙️ Application Settings"
            subtitle="Configure GST rates, company details, and other settings"
          >
            {/* GST Settings */}
            <div className="mb-8 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Percent className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    GST Configuration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure GST rates for invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    CGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={cgst}
                    onChange={(e) => setCgst(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Central Goods and Services Tax
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    SGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={sgst}
                    onChange={(e) => setSgst(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    State Goods and Services Tax
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    IGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={igst}
                    onChange={(e) => setIgst(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Integrated Goods and Services Tax (Inter-state)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Default GST Type
                  </label>
                  <select
                    value={defaultGSTType}
                    onChange={(e) => setDefaultGSTType(e.target.value as "cgst_sgst" | "igst")}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-blue-500"
                  >
                    <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                    <option value="igst">IGST (Inter-state)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default GST type for new invoices
                  </p>
                </div>
              </div>

              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Preview:</strong> Total GST = {cgst + sgst}% (CGST {cgst}% + SGST {sgst}%) or IGST {igst}%
                </p>
              </div>

              <button
                onClick={handleSaveGSTSettings}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save GST Settings"}
              </button>
            </div>

            {/* Company Settings */}
            <div className="p-6 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Building2 className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Company Information
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure company details for invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    <Phone className="inline mr-1" size={14} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <textarea
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Enter company address"
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    <Mail className="inline mr-1" size={14} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    <FileText className="inline mr-1" size={14} />
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={companyGSTIN}
                    onChange={(e) => setCompanyGSTIN(e.target.value)}
                    placeholder="Enter GSTIN"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] px-4 py-3 text-gray-800 dark:text-white/90 focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Prefix for invoice numbers (e.g., INV-001)
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveCompanySettings}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Company Settings"}
              </button>
            </div>
          </TASection>
        </div>
      </div>
    </>
  );
}
