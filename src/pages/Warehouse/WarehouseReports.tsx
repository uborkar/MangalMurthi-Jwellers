// ------------------------------------------------------------
// src/pages/Warehouse/WarehouseReports.tsx
// FULLY UPDATED TO SUPPORT CATEGORY-WISE INVENTORY STRUCTURE
// warehouse/inventory/{category}/items/{id}
// ------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import TASection from "../../components/common/TASection";
import PageMeta from "../../components/common/PageMeta";
import { db } from "../../firebase/config";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  collectionGroup,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

// -------------------- TYPES -----------------------
type ActivityRow = {
  id: string;
  date: string;
  action: "Stock-In" | "Tagging" | "Categorized" | "Distributed" | "Returned";
  label?: string;
  category?: string;
  qty?: number;
  weight?: number;
  shop?: string;
};

// Safe timestamp → ISO
function toISO(d: any): string {
  if (!d) return new Date().toISOString();
  if (d instanceof Timestamp && d.toDate) return d.toDate().toISOString();
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const inputStyle = "w-full rounded-xl border border-gray-300 px-3 py-2 bg-white dark:bg-gray-900";

export default function WarehouseReport() {
  // -------------------- FILTERS -----------------------
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // -------------------- DATABASE STATES -----------------------
  const [stockItems, setStockItems] = useState<DocumentData[]>([]);
  const [taggedItems, setTaggedItems] = useState<DocumentData[]>([]);
  const [inventoryItems, setInventoryItems] = useState<DocumentData[]>([]);
  const [transferItems, setTransferItems] = useState<DocumentData[]>([]);
  const [returnItems, setReturnItems] = useState<DocumentData[]>([]);

  const [loading, setLoading] = useState(true);

  // -------------------- LISTENERS -----------------------
  useEffect(() => {
    setLoading(true);

    // Stock-in
    const unsubStock = onSnapshot(
      query(collection(db, "warehouse", "stock", "items"), orderBy("createdAt", "desc")),
      (snap) => {
        setStockItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    // Tagged
    const unsubTagged = onSnapshot(
      query(collection(db, "warehouse", "tagged_items", "items"), orderBy("createdAt", "desc")),
      (snap) => setTaggedItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    // INVENTORY – FIXED FOR NEW RULE:
    // warehouse/inventory/{category}/items/{id}
    const unsubInventory = onSnapshot(
      collectionGroup(db, "items"), // fetch ALL category inventory items
      (snap) => {
        const filtered = snap.docs
          .filter((d) => d.ref.path.startsWith("warehouse/inventory"))
          .map((d) => ({ id: d.id, ...d.data() }));

        setInventoryItems(filtered);
      }
    );

    // Transfers
    const unsubTransfers = onSnapshot(
      query(collection(db, "warehouse", "transfers", "items"), orderBy("date", "desc")),
      (snap) => setTransferItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    // Returns
    const unsubReturns = onSnapshot(
      query(collection(db, "warehouse", "returns", "items"), orderBy("date", "desc")),
      (snap) => setReturnItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubStock();
      unsubTagged();
      unsubInventory();
      unsubTransfers();
      unsubReturns();
    };
  }, []);

  // -------------------- CATEGORY LIST -----------------------
  const categories = useMemo(() => {
    const set = new Set<string>();
    [...stockItems, ...taggedItems, ...inventoryItems].forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [stockItems, taggedItems, inventoryItems]);

  // -------------------- CATEGORY SUMMARY -----------------------
  const categorySummary = useMemo(() => {
    type Row = {
      category: string;
      stockIn: number;
      tagged: number;
      pendingTag: number;
      inventory: number;
      distributed: number;
      returned: number;
      totalWeight: number;
    };

    const map = new Map<string, Row>();

    const ensure = (cat: string) => {
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          stockIn: 0,
          tagged: 0,
          pendingTag: 0,
          inventory: 0,
          distributed: 0,
          returned: 0,
          totalWeight: 0,
        });
      }
      return map.get(cat)!;
    };

    // STOCK-IN
    stockItems.forEach((s) => {
      const cat = s.category || "Uncategorized";
      const row = ensure(cat);

      const qty = Number(s.quantity || 1);
      const weight = Number(s.weight || 0);

      row.stockIn += qty;
      row.totalWeight += weight;

      if (!s.tagged) row.pendingTag += qty;
    });

    // TAGGED
    taggedItems.forEach((t) => {
      const row = ensure(t.category || "Uncategorized");
      row.tagged += 1;
    });

    // INVENTORY
    inventoryItems.forEach((inv) => {
      const row = ensure(inv.category || "Uncategorized");
      row.inventory += Number(inv.quantity || 1);
    });

    // TRANSFERS
    transferItems.forEach((tr) => {
      const rows = tr.rows || [];
      rows.forEach((rr: any) => {
        const row = ensure(rr.category);
        row.distributed += Number(rr.quantity || 1);
      });
    });

    // RETURNS
    returnItems.forEach((ret) => {
      const rows = ret.rows || [];
      rows.forEach((rr: any) => {
        const row = ensure(rr.category);
        row.returned += Number(rr.quantity || 1);
      });
    });

    return Array.from(map.values());
  }, [stockItems, taggedItems, inventoryItems, transferItems, returnItems]);

  // -------------------- DONUT CHART -----------------------
  const donut = {
    labels: categorySummary.map((r) => r.category),
    series: categorySummary.map((r) => r.inventory),
  };

  const donutOptions: ApexOptions = {
    chart: { type: "donut" },
    legend: { position: "bottom" },
  };

  // -------------------- MONTHLY BAR CHART -----------------------
  const { stockSeries, distSeries } = useMemo(() => {
    const year = new Date().getFullYear();
    const stock = new Array(12).fill(0);
    const dist = new Array(12).fill(0);

    stockItems.forEach((s) => {
      const d = new Date(s.createdAt);
      if (d.getFullYear() === year) {
        stock[d.getMonth()] += Number(s.weight || 1);
      }
    });

    transferItems.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year) {
        const rows = t.rows || [];
        const totalWeight = rows.reduce(
          (a: number, r: any) => a + Number(r.weight || 0),
          0
        );
        dist[d.getMonth()] += totalWeight;
      }
    });

    return { stockSeries: stock, distSeries: dist };
  }, [stockItems, transferItems]);

  const barOptions: ApexOptions = {
    chart: { type: "bar" },
    xaxis: { categories: months },
  };

  // -------------------- ACTIVITIES TABLE -----------------------
  const activities = useMemo<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];

    // stock
    stockItems.forEach((d) =>
      rows.push({
        id: d.id,
        date: toISO(d.createdAt),
        action: "Stock-In",
        label: d.productName,
        category: d.category,
        qty: d.quantity,
        weight: Number(d.weight || 0),
      })
    );

    // tagged
    taggedItems.forEach((d) =>
      rows.push({
        id: d.id,
        date: toISO(d.createdAt),
        action: "Tagging",
        label: d.label,
        category: d.category,
        qty: 1,
        weight: Number(d.weight || 0),
      })
    );

    // inventory
    inventoryItems.forEach((d) =>
      rows.push({
        id: d.id,
        date: toISO(d.createdAt),
        action: "Categorized",
        label: d.label,
        category: d.category,
        qty: d.quantity || 1,
        weight: Number(d.weight || 0),
      })
    );

    return rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [stockItems, taggedItems, inventoryItems]);

  // FILTER
  const filteredActivities = useMemo(() => {
    let list = [...activities];

    if (startDate) {
      const min = new Date(startDate).getTime();
      list = list.filter((a) => new Date(a.date).getTime() >= min);
    }
    if (endDate) {
      const max = new Date(endDate + "T23:59:59").getTime();
      list = list.filter((a) => new Date(a.date).getTime() <= max);
    }
    if (categoryFilter) {
      list = list.filter(
        (a) => a.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    if (typeFilter) {
      list = list.filter((a) => a.action === typeFilter);
    }

    return list;
  }, [activities, startDate, endDate, categoryFilter, typeFilter]);

  // -------------------- UI -----------------------
  return (
    <>
      <PageMeta title="Warehouse Analytics" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TASection
            title="📦 Warehouse Category Report"
            subtitle="Category-wise monitoring of stock, tagging, inventory, transfers and returns"
          >
            {/* SUMMARY ROW */}
            <div className="grid grid-cols-12 gap-4 mb-6">
              <SummaryCard title="Total Categories" value={categories.length} />
              <SummaryCard title="Stock-In Docs" value={stockItems.length} />
              <SummaryCard title="Tagged Docs" value={taggedItems.length} />
              <SummaryCard
                title="Inventory Docs"
                value={inventoryItems.length}
              />
            </div>

            {/* FILTERS */}
            <Filters
              inputStyle={inputStyle}
              startDate={startDate}
              endDate={endDate}
              categoryFilter={categoryFilter}
              typeFilter={typeFilter}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              setCategoryFilter={setCategoryFilter}
              setTypeFilter={setTypeFilter}
              categories={categories}
            />

            {/* CATEGORY CARDS */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-7 space-y-4">
                {categorySummary.map((c) => (
                  <CategoryCard key={c.category} data={c} />
                ))}
              </div>

              {/* CHARTS */}
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <ChartCard title="Category Inventory Distribution">
                  <Chart
                    type="donut"
                    height={260}
                    series={donut.series}
                    options={donutOptions}
                  />
                </ChartCard>

                <ChartCard title="Stock-In vs Distributed (Monthly)">
                  <Chart
                    type="bar"
                    height={260}
                    series={[
                      { name: "Stock-In", data: stockSeries },
                      { name: "Distributed", data: distSeries },
                    ]}
                    options={barOptions}
                  />
                </ChartCard>
              </div>
            </div>

            {/* ACTIVITY TABLE */}
            <ActivityTable rows={filteredActivities} />
          </TASection>
        </div>
      </div>
    </>
  );
}

// -------------------- SMALL COMPONENTS -----------------------
function SummaryCard({ title, value }: any) {
  return (
    <div className="col-span-12 md:col-span-3 p-5 rounded-xl bg-white dark:bg-gray-800 shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="p-4 rounded-xl border bg-white dark:bg-gray-900">
      <h4 className="text-md font-semibold mb-3">{title}</h4>
      {children}
    </div>
  );
}

function CategoryCard({ data }: any) {
  const percent =
    data.stockIn > 0 ? Math.round((data.inventory / data.stockIn) * 100) : 0;

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border">
      <div className="flex justify-between">
        <div>
          <h3 className="font-semibold text-lg">{data.category}</h3>
          <p className="text-sm text-gray-500">
            Stock-in: {data.stockIn} | Inventory: {data.inventory}
          </p>
        </div>
        <div className="text-right font-semibold">{percent}%</div>
      </div>

      <div className="grid grid-cols-5 mt-3 text-center">
        <InfoTag title="Tagged" value={data.tagged} />
        <InfoTag title="Pending Tag" value={data.pendingTag} />
        <InfoTag title="Distributed" value={data.distributed} />
        <InfoTag title="Returned" value={data.returned} />
        <InfoTag
          title="Weight"
          value={`${Number(data.totalWeight).toFixed(2)} g`}
        />
      </div>
    </div>
  );
}

function InfoTag({ title, value }: any) {
  return (
    <div className="p-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-xl">
      <div className="text-gray-500">{title}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Filters({
  inputStyle,
  startDate,
  endDate,
  categoryFilter,
  typeFilter,
  setStartDate,
  setEndDate,
  setCategoryFilter,
  setTypeFilter,
  categories,
}: any) {
  return (
    <div className="p-5 mb-6 bg-white dark:bg-gray-900 border rounded-xl">
      <div className="grid grid-cols-4 gap-4">
        <input
          type="date"
          className={inputStyle}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className={inputStyle}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <select
          className={inputStyle}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c: string) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className={inputStyle}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Stock-In">Stock-In</option>
          <option value="Tagging">Tagging</option>
          <option value="Categorized">Categorized</option>
          <option value="Distributed">Distributed</option>
          <option value="Returned">Returned</option>
        </select>
      </div>
    </div>
  );
}

function ActivityTable({ rows }: any) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl mt-6">
      <h3 className="font-semibold mb-3">Activity Feed</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {["Date", "Action", "Label", "Category", "Qty", "Weight"].map(
                (h) => (
                  <th key={h} className="p-2 text-left text-gray-700">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  No activity found
                </td>
              </tr>
            ) : (
              rows.map((r: ActivityRow) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    {new Date(r.date).toLocaleString()}
                  </td>
                  <td className="p-2">{r.action}</td>
                  <td className="p-2">{r.label}</td>
                  <td className="p-2">{r.category}</td>
                  <td className="p-2">{r.qty}</td>
                  <td className="p-2">{r.weight}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
