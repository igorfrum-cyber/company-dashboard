import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  Line,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  ArrowDownRight,
  LayoutDashboard,
  Percent,
  FileText,
  Zap,
  Info,
  CircleDollarSign,
  ChevronDown,
  ShoppingBag,
  Trophy,
  Tags,
  Users,
} from "lucide-react";
import { FALLBACK_DATA } from "./data/fallbackData";
import { loadBrandSalesDataFromGoogleSheets, loadDashboardDataFromGoogleSheets } from "./services/googleSheets";
import { OPEX_COLORS, TAX_COLORS } from "./utils/chartColors";
import { formatCurrency, formatMillion, formatRevenueShare } from "./utils/formatters";

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || "";
const BRANDS_SHEET_ID = import.meta.env.VITE_BRANDS_GOOGLE_SHEET_ID || "";
const BRANDS_SHEET_NAME = import.meta.env.VITE_BRANDS_SHEET_NAME || "Бренды";

const BUSINESS_UNITS = [
  { id: "company", label: "ООО Кристайл", enabled: false },
  { id: "tyumen", label: "Тюмень", enabled: true },
  { id: "surgut", label: "Сургут", enabled: false },
  { id: "novy-urengoy", label: "Новый Уренгой", enabled: false },
];

const FINANCE_TABS = [
  { id: "overview", label: "Обзор", icon: TrendingUp },
  { id: "structure", label: "Расходы", icon: PieChartIcon },
  { id: "waterfall", label: "Детализация", icon: ArrowDownRight },
  { id: "analysis", label: "Анализ", icon: FileText },
];

const SALES_TABS = [
  { id: "brands", label: "Бренды", icon: Tags },
  { id: "managers", label: "Менеджеры", icon: Users },
  { id: "seminars", label: "Семинары", icon: FileText },
  { id: "plan", label: "План", icon: FileText },
];

const BRAND_COLORS = ["#4f46e5", "#06b6d4", "#94a3b8", "#0ea5e9", "#f59e0b", "#22c55e", "#64748b", "#8b5cf6"];

const FALLBACK_BRAND_SALES = [
  {
    name: "Alfaparf Milano",
    purchasePlan: 3200000,
    salesPlan: 4700000,
    monthlySales: { Январь: 2380000, Февраль: 3120000, Март: 3860000 },
  },
  {
    name: "Davines",
    purchasePlan: 2600000,
    salesPlan: 3900000,
    monthlySales: { Январь: 1820000, Февраль: 2410000, Март: 3180000 },
  },
  {
    name: "L'Oreal Professionnel",
    purchasePlan: 2100000,
    salesPlan: 3300000,
    monthlySales: { Январь: 1650000, Февраль: 2050000, Март: 2710000 },
  },
  {
    name: "Matrix",
    purchasePlan: 1250000,
    salesPlan: 2100000,
    monthlySales: { Январь: 870000, Февраль: 1420000, Март: 1960000 },
  },
  {
    name: "Estel",
    purchasePlan: 980000,
    salesPlan: 1600000,
    monthlySales: { Январь: 740000, Февраль: 1080000, Март: 1350000 },
  },
  {
    name: "Wella",
    purchasePlan: 760000,
    salesPlan: 1200000,
    monthlySales: { Январь: 610000, Февраль: 790000, Март: 970000 },
  },
];

const Card = ({ title, value, subValue, icon: Icon, colorClass, children }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex min-h-[180px] flex-col">
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className={`shrink-0 p-3 rounded-xl ${colorClass}`}>
          <Icon size={24} className="text-white" />
        </div>
        <span className="min-w-0 flex-1 break-words text-right text-[11px] font-bold uppercase leading-snug tracking-wider text-slate-400">
          {title}
        </span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <div className="text-sm text-slate-500 mt-1">{subValue}</div>
      </div>
    </div>
    {children && <div className="mt-auto pt-5">{children}</div>}
  </div>
);

const MonthSelector = ({ value, months, onChange }) => (
  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
    <span>Месяц</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="appearance-none bg-transparent pr-5 font-bold text-slate-800 outline-none"
    >
      {months.map((month) => (
        <option key={month.name} value={month.name}>
          {month.name}
        </option>
      ))}
    </select>
    <ChevronDown size={14} className="pointer-events-none -ml-5 text-slate-400" />
  </label>
);

const getOpexItems = (month) =>
  month.opexItems?.length > 0
    ? month.opexItems
    : [
        { name: "Зарплаты", value: month.opexDetails?.salaries || 0 },
        { name: "Доставка", value: month.opexDetails?.delivery || 0 },
        { name: "Прочие OpEx", value: month.opexDetails?.other || 0 },
      ];

const getTaxItems = (month) =>
  month.taxItems?.length > 0 ? month.taxItems : [{ name: "Налоги и фин. расходы", value: month.taxes || 0 }];

const getAverage = (items, key) => {
  if (!items.length) {
    return 0;
  }

  return items.reduce((sum, item) => sum + (item[key] || 0), 0) / items.length;
};

const getYtdMargin = (items, key) => {
  const revenue = items.reduce((sum, item) => sum + (item.revenue || 0), 0);
  if (!revenue) {
    return 0;
  }

  const value = items.reduce((sum, item) => sum + (item[key] || 0), 0);
  return (value / revenue) * 100;
};

const PlaceholderChart = ({ title }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Данные из Google Sheets подключим на следующем шаге.</p>
      </div>
      <ShoppingBag className="text-slate-300" size={32} />
    </div>
    <div className="flex h-[320px] items-end gap-4 rounded-xl bg-white p-6">
      {[34, 58, 42, 76, 63, 88].map((height, index) => (
        <div key={index} className="flex flex-1 flex-col justify-end gap-3">
          <div className="rounded-t-lg bg-slate-200" style={{ height: `${height}%` }}></div>
          <div className="h-2 rounded-full bg-slate-100"></div>
        </div>
      ))}
    </div>
  </div>
);

const getBrandMonthSales = (brand, monthName) => brand.monthlySales?.[monthName] || 0;

const getLatestBrandSales = (brand, months) => {
  for (let i = months.length - 1; i >= 0; i -= 1) {
    const value = getBrandMonthSales(brand, months[i].name);
    if (value > 0) {
      return value;
    }
  }

  return 0;
};

const BrandSalesAnalytics = ({ brands, months, latestMonth, selectedBrandName, onSelectBrand }) => {
  const latestRevenue = latestMonth?.revenue || 0;
  const selectedBrand = brands.find((brand) => brand.name === selectedBrandName);
  const rows = brands
    .map((brand, index) => ({
      ...brand,
      color: BRAND_COLORS[index % BRAND_COLORS.length],
      latestFact: getBrandMonthSales(brand, latestMonth.name) || getLatestBrandSales(brand, months),
    }))
    .sort((a, b) => b.latestFact - a.latestFact);

  const chartData = rows.filter((brand) => brand.latestFact > 0);
  const trendData = selectedBrand
    ? months.map((month) => {
        const value = getBrandMonthSales(selectedBrand, month.name);
        return {
          name: month.name,
          sales: value,
          revenueShare: month.revenue ? Number(((value / month.revenue) * 100).toFixed(1)) : 0,
        };
      })
    : [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="rounded-2xl bg-white p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">Продажи брендов: {latestMonth.name}</h2>
            <p className="text-sm text-slate-500">Доля считается от общей выручки месяца.</p>
          </div>
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={105}
                  outerRadius={180}
                  paddingAngle={3}
                  dataKey="latestFact"
                  onClick={(entry) => onSelectBrand(entry.name)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={selectedBrandName === entry.name ? "#0f172a" : "#ffffff"}
                      strokeWidth={selectedBrandName === entry.name ? 3 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(value), "Продажи"]}
                  labelFormatter={(label) => label}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((brand) => {
            const isActive = selectedBrandName === brand.name;
            const share = latestRevenue ? ((brand.latestFact / latestRevenue) * 100).toFixed(1) : "0.0";

            return (
              <button
                key={brand.name}
                type="button"
                onClick={() => onSelectBrand(brand.name)}
                className={`flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition-colors ${
                  isActive ? "bg-blue-50 ring-2 ring-blue-200" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: brand.color }} />
                  <span className="min-w-0 text-lg font-black text-slate-800">{brand.name}</span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-black text-slate-900">{formatCurrency(brand.latestFact)}</div>
                  <div className="text-sm font-semibold text-slate-400">{share}% от выручки</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedBrand && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Динамика продаж: {selectedBrand.name}</h3>
              <p className="text-sm text-slate-500">Столбцы показывают продажи бренда, линия — процент от выручки.</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectBrand("")}
              className="self-start rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 md:self-auto"
            >
              Скрыть график
            </button>
          </div>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} dy={10} />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b" }}
                  tickFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip formatter={(value, name) => [name.includes("%") ? `${value}%` : formatCurrency(value), name]} />
                <Bar yAxisId="left" dataKey="sales" name="Продажи бренда" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={70} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenueShare"
                  name="% от выручки"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 6, fill: "#f59e0b" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-4 font-bold">Бренд</th>
              <th className="px-5 py-4 font-bold text-right">План выкупа у поставщика</th>
              <th className="px-5 py-4 font-bold text-right">План продаж</th>
              <th className="px-5 py-4 font-bold text-right">Факт продаж за {latestMonth.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((brand) => (
              <tr key={brand.name} className="hover:bg-slate-50/70">
                <td className="px-5 py-4 font-bold text-slate-800">{brand.name}</td>
                <td className="px-5 py-4 text-right text-slate-600">{formatCurrency(brand.purchasePlan)}</td>
                <td className="px-5 py-4 text-right text-slate-600">{formatCurrency(brand.salesPlan)}</td>
                <td className="px-5 py-4 text-right font-black text-blue-600">{formatCurrency(brand.latestFact)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const App = () => {
  const [portalMode, setPortalMode] = useState("finances");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSalesTab, setActiveSalesTab] = useState("brands");
  const [activeBusinessUnit] = useState("tyumen");
  const [processedData, setProcessedData] = useState(FALLBACK_DATA);
  const [brandSalesData, setBrandSalesData] = useState(FALLBACK_BRAND_SALES);
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(FALLBACK_DATA[FALLBACK_DATA.length - 1]);
  const [cardMonths, setCardMonths] = useState({
    revenue: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
    profit: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
    expenses: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
  });
  const [expenseTrendSelection, setExpenseTrendSelection] = useState(null);
  const [loading, setLoading] = useState(Boolean(SHEET_ID));
  const [brandLoading, setBrandLoading] = useState(Boolean(BRANDS_SHEET_ID));
  const [error, setError] = useState("");
  const [brandError, setBrandError] = useState("");
  const [sourceMode, setSourceMode] = useState(SHEET_ID ? "google" : "fallback");
  const [brandSourceMode, setBrandSourceMode] = useState(BRANDS_SHEET_ID ? "google" : "fallback");

  useEffect(() => {
    const run = async () => {
      if (!SHEET_ID) {
        setSourceMode("fallback");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await loadDashboardDataFromGoogleSheets(SHEET_ID);
        if (!data.length) {
          throw new Error("В Google Sheets не найдено заполненных месяцев (выручка > 0).");
        }
        setProcessedData(data);
        setSelectedMonth(data[data.length - 1]);
        setCardMonths({
          revenue: data[data.length - 1].name,
          profit: data[data.length - 1].name,
          expenses: data[data.length - 1].name,
        });
        setSourceMode("google");
      } catch (loadError) {
        setError(loadError.message || "Не удалось загрузить данные из Google Sheets.");
        setSourceMode("fallback");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!BRANDS_SHEET_ID) {
        setBrandSourceMode("fallback");
        return;
      }

      setBrandLoading(true);
      setBrandError("");
      try {
        const data = await loadBrandSalesDataFromGoogleSheets(BRANDS_SHEET_ID, BRANDS_SHEET_NAME);
        if (!data.length) {
          throw new Error("В таблице брендов не найдено строк с продажами.");
        }
        setBrandSalesData(data);
        setBrandSourceMode("google");
      } catch (loadError) {
        setBrandError(loadError.message || "Не удалось загрузить данные брендов из Google Sheets.");
        setBrandSourceMode("fallback");
      } finally {
        setBrandLoading(false);
      }
    };

    run();
  }, []);

  const firstMonth = processedData[0];
  const latestMonth = processedData[processedData.length - 1];
  const revenueGrowth = firstMonth?.revenue
    ? ((latestMonth.revenue / firstMonth.revenue - 1) * 100).toFixed(0)
    : "0";
  const revenueCardMonth = processedData.find((month) => month.name === cardMonths.revenue) || latestMonth;
  const profitCardMonth = processedData.find((month) => month.name === cardMonths.profit) || latestMonth;
  const expensesCardMonth = processedData.find((month) => month.name === cardMonths.expenses) || latestMonth;
  const averageMonthlyProfit = getAverage(processedData, "netProfit");
  const averageMonthlyTvIncome = getAverage(processedData, "tvIncome");
  const ytdEbitdaMargin = getYtdMargin(processedData, "ebitda");
  const ytdNetMargin = getYtdMargin(processedData, "netProfit");
  const expensesCardTotal = (expensesCardMonth.opex || 0) + (expensesCardMonth.taxes || 0);
  const updateCardMonth = (card, monthName) => {
    setCardMonths((current) => ({ ...current, [card]: monthName }));
  };

  const waterfallData = useMemo(() => {
    const d = selectedMonth;
    return [
      { name: "Выручка", range: [0, d.revenue], color: "#3b82f6", value: d.revenue },
      { name: "Себестоимость", range: [d.grossProfit, d.revenue], color: "#ef4444", value: -d.cogs },
      { name: "Вал. прибыль", range: [0, d.grossProfit], color: "#6366f1", value: d.grossProfit },
      { name: "Опер. расходы", range: [d.ebitda, d.grossProfit], color: "#f59e0b", value: -d.opex },
      { name: "EBITDA", range: [0, d.ebitda], color: "#10b981", value: d.ebitda },
      { name: "Налоги/фин.", range: [d.netProfit, d.ebitda], color: "#6b7280", value: -d.taxes },
      { name: "Чистая прибыль", range: [0, d.netProfit], color: "#059669", value: d.netProfit },
    ];
  }, [selectedMonth]);

  const opexBreakdown = useMemo(() => {
    const baseItems = getOpexItems(selectedMonth);

    const sortedItems = [...baseItems]
      .filter((item) => (item.value || 0) > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    return sortedItems.map((item, index) => ({
      ...item,
      color: OPEX_COLORS[index % OPEX_COLORS.length],
    }));
  }, [selectedMonth]);

  const taxBreakdown = useMemo(() => {
    const baseItems = getTaxItems(selectedMonth);

    const sortedItems = [...baseItems]
      .filter((item) => (item.value || 0) > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    return sortedItems.map((item, index) => ({
      ...item,
      color: TAX_COLORS[index % TAX_COLORS.length],
    }));
  }, [selectedMonth]);

  const expenseTrendData = useMemo(() => {
    if (!expenseTrendSelection) {
      return processedData.map((month) => {
        const opex = month.opex || 0;
        const taxes = month.taxes || 0;
        const total = opex + taxes;

        return {
          name: month.name,
          opex,
          taxes,
          revenueShare: month.revenue ? Number(((total / month.revenue) * 100).toFixed(1)) : 0,
        };
      });
    }

    return processedData.map((month) => {
      const items = expenseTrendSelection.type === "opex" ? getOpexItems(month) : getTaxItems(month);
      const item = items.find((candidate) => candidate.name === expenseTrendSelection.name);
      const value = item?.value || 0;

      return {
        name: month.name,
        value,
        revenueShare: month.revenue ? Number(((value / month.revenue) * 100).toFixed(1)) : 0,
      };
    });
  }, [expenseTrendSelection, processedData]);

  const expenseTrendTitle = expenseTrendSelection
    ? `Динамика: ${expenseTrendSelection.name}`
    : "Динамика операционных и финансовых расходов";
  const activeSalesTabLabel = SALES_TABS.find((tab) => tab.id === activeSalesTab)?.label || "Бренды";

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 font-sans text-slate-900 md:px-5 md:py-6">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-5 lg:flex-row lg:items-start">
        <aside className="w-full lg:sticky lg:top-6 lg:w-44 lg:shrink-0">
          <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:flex-col lg:overflow-visible">
            {BUSINESS_UNITS.map((unit) => {
              const isActive = activeBusinessUnit === unit.id;

              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={!unit.enabled}
                  className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "cursor-not-allowed bg-slate-100 text-slate-400"
                  }`}
                >
                  {unit.label}
                </button>
              );
            })}
          </div>
        </aside>
        <main className="min-w-0 flex-1">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="text-blue-600" />
              {portalMode === "finances" ? "Финансовый дашборд компании" : "Продажи и аналитика"}
            </h1>
            <p className="text-slate-500 mt-1">
              {portalMode === "finances"
                ? `Источник: ${sourceMode === "google" ? "Google Sheets" : "Демо-данные"}`
                : `Источник продаж: ${brandSourceMode === "google" ? "Google Sheets" : "Демо-данные"}`}
            </p>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPortalMode(portalMode === "finances" ? "sales" : "finances")}
              className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
            >
              {portalMode === "finances" ? <ShoppingBag size={16} /> : <LayoutDashboard size={16} />}
              {portalMode === "finances" ? "Продажи" : "Финансы"}
            </button>
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
              {(portalMode === "finances" ? FINANCE_TABS : SALES_TABS).map((tab) => {
                const isActive = portalMode === "finances" ? activeTab === tab.id : activeSalesTab === tab.id;
                const handleClick = () => {
                  if (portalMode === "finances") {
                    setActiveTab(tab.id);
                  } else {
                    setActiveSalesTab(tab.id);
                  }
                };

                return (
                  <button
                    key={tab.id}
                    onClick={handleClick}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {portalMode === "finances" && loading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 text-sm">
            Загружаю данные из Google Sheets...
          </div>
        )}

        {portalMode === "finances" && error && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
            {error} Сейчас показываю последние рабочие (демо) данные.
          </div>
        )}

        {portalMode === "finances" && !SHEET_ID && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm">
            Чтобы включить автообновление: добавьте в Vercel переменную{" "}
            <code className="font-mono">VITE_GOOGLE_SHEET_ID</code>.
          </div>
        )}

        {portalMode === "sales" && brandLoading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700 text-sm">
            Загружаю продажи брендов из Google Sheets...
          </div>
        )}

        {portalMode === "sales" && brandError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
            {brandError} Сейчас показываю демо-структуру брендов.
          </div>
        )}

        {portalMode === "sales" && activeSalesTab === "brands" && !BRANDS_SHEET_ID && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm">
            Чтобы подключить отдельную таблицу брендов: добавьте переменные{" "}
            <code className="font-mono">VITE_BRANDS_GOOGLE_SHEET_ID</code> и{" "}
            <code className="font-mono">VITE_BRANDS_SHEET_NAME</code>.
          </div>
        )}

        {portalMode === "finances" ? (
          <>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
          <Card
            title={`Выручка (${revenueCardMonth.name})`}
            value={formatMillion(revenueCardMonth.revenue)}
            subValue={`Себестоимость товаров: ${formatCurrency(revenueCardMonth.cogs)}`}
            icon={DollarSign}
            colorClass="bg-blue-500"
          >
            <MonthSelector
              value={revenueCardMonth.name}
              months={processedData}
              onChange={(monthName) => updateCardMonth("revenue", monthName)}
            />
          </Card>
          <Card
            title={`Чистая прибыль (${profitCardMonth.name})`}
            value={formatMillion(profitCardMonth.netProfit)}
            subValue={`Маржа ${profitCardMonth.netMargin}%`}
            icon={Zap}
            colorClass="bg-emerald-500"
          >
            <MonthSelector
              value={profitCardMonth.name}
              months={processedData}
              onChange={(monthName) => updateCardMonth("profit", monthName)}
            />
          </Card>
          <Card
            title={`Расходы (${expensesCardMonth.name})`}
            value={formatCurrency(expensesCardTotal)}
            subValue={
              <span className="space-y-1">
                <span className="block">Операционные: {formatCurrency(expensesCardMonth.opex)}</span>
                <span className="block">Финансовые: {formatCurrency(expensesCardMonth.taxes)}</span>
              </span>
            }
            icon={ArrowDownRight}
            colorClass="bg-indigo-500"
          >
            <MonthSelector
              value={expensesCardMonth.name}
              months={processedData}
              onChange={(monthName) => updateCardMonth("expenses", monthName)}
            />
          </Card>
          <Card
            title="Средняя маржа за год"
            value={`${ytdEbitdaMargin.toFixed(1)}% EBITDA`}
            subValue={<span className="block text-2xl font-bold text-slate-800">{ytdNetMargin.toFixed(1)}% чистая прибыль</span>}
            icon={Percent}
            colorClass="bg-amber-500"
          />
          <Card
            title="Среднемесячная прибыль"
            value={formatMillion(averageMonthlyProfit)}
            subValue={`Средние доходы ТВ: ${formatCurrency(averageMonthlyTvIncome)}`}
            icon={CircleDollarSign}
            colorClass="bg-fuchsia-500"
          />
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[500px]">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Рост бизнеса и эффективность</h2>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value, name) => [name.includes("%") ? `${value}%` : formatCurrency(value), name]} />
                    <Bar yAxisId="left" dataKey="revenue" name="Выручка" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={60} />
                    <Bar yAxisId="left" dataKey="ebitda" name="EBITDA" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
                    <Line yAxisId="right" type="monotone" dataKey="ebitdaMargin" name="Рентабельность EBITDA %" stroke="#059669" strokeWidth={3} dot={{ r: 6, fill: "#059669" }} />
                    <Bar yAxisId="left" dataKey="netProfit" name="Чистая прибыль" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={60} />
                    <Line yAxisId="right" type="monotone" dataKey="netMargin" name="Рентабельность чистой прибыли %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6, fill: "#f59e0b" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "structure" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Расшифровка расходов и налогов</h2>
                <div className="flex gap-2">
                  {processedData.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        selectedMonth.name === m.name ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-700">Операционные расходы (OpEx): {selectedMonth.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={opexBreakdown} cx="50%" cy="50%" innerRadius={74} outerRadius={116} paddingAngle={3} dataKey="value">
                            {opexBreakdown.map((entry, index) => (
                              <Cell key={`opex-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 max-h-[320px] overflow-auto pr-2">
                      {opexBreakdown.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setExpenseTrendSelection({ type: "opex", name: item.name })}
                          className={`flex w-full items-center justify-between p-3 rounded-xl text-left transition-colors ${
                            expenseTrendSelection?.type === "opex" && expenseTrendSelection?.name === item.name
                              ? "bg-indigo-50 ring-2 ring-indigo-200"
                              : "bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.value)}</div>
                            <div className="text-xs text-slate-400">
                              {selectedMonth.opex ? ((item.value / selectedMonth.opex) * 100).toFixed(1) : 0}% от OpEx
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-slate-800">
                    <span>ИТОГО OpEx</span>
                    <span>{formatCurrency(selectedMonth.opex)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-700">Налоги и фин. расходы: {selectedMonth.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={taxBreakdown} cx="50%" cy="50%" innerRadius={74} outerRadius={116} paddingAngle={3} dataKey="value">
                            {taxBreakdown.map((entry, index) => (
                              <Cell key={`tax-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 max-h-[320px] overflow-auto pr-2">
                      {taxBreakdown.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setExpenseTrendSelection({ type: "tax", name: item.name })}
                          className={`flex w-full items-center justify-between p-3 rounded-xl text-left transition-colors ${
                            expenseTrendSelection?.type === "tax" && expenseTrendSelection?.name === item.name
                              ? "bg-amber-50 ring-2 ring-amber-200"
                              : "bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.value)}</div>
                            <div className="text-xs text-slate-400">
                              {selectedMonth.taxes ? ((item.value / selectedMonth.taxes) * 100).toFixed(1) : 0}% от налогов
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between font-black text-slate-800">
                    <span>ИТОГО налоги/фин. расходы</span>
                    <span>{formatCurrency(selectedMonth.taxes)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-8">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{expenseTrendTitle}</h3>
                    <p className="text-sm text-slate-500">
                      {expenseTrendSelection
                        ? "Столбцы показывают выбранную статью, линия показывает долю от выручки."
                        : "Столбцы показывают OpEx и финрасходы, линия показывает их суммарную долю от выручки."}
                    </p>
                  </div>
                  {expenseTrendSelection && (
                    <button
                      type="button"
                      onClick={() => setExpenseTrendSelection(null)}
                      className="self-start rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 md:self-auto"
                    >
                      Показать все расходы
                    </button>
                  )}
                </div>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={expenseTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} dy={10} />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                        tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip formatter={(value, name) => [name.includes("%") ? `${value}%` : formatCurrency(value), name]} />
                      {expenseTrendSelection ? (
                        <Bar
                          yAxisId="left"
                          dataKey="value"
                          name={expenseTrendSelection.name}
                          fill={expenseTrendSelection.type === "opex" ? "#6366f1" : "#f59e0b"}
                          radius={[6, 6, 0, 0]}
                          barSize={70}
                        />
                      ) : (
                        <>
                          <Bar yAxisId="left" dataKey="opex" name="Операционные расходы" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={70} />
                          <Bar yAxisId="left" dataKey="taxes" name="Финансовые расходы" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={70} />
                        </>
                      )}
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenueShare"
                        name="% от выручки"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={{ r: 6, fill: "#0f766e" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "waterfall" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold">Декомпозиция прибыли: {selectedMonth.name}</h2>
                <div className="flex gap-2">
                  {processedData.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedMonth.name === m.name ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.02)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }

                        const data = payload[0]?.payload;
                        const amount = Number(data?.value || 0);
                        const revenueShare = formatRevenueShare(amount, selectedMonth.revenue);
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100">
                            <p className="font-bold text-slate-800">{data?.name}</p>
                            <p className={`${amount < 0 ? "text-red-500" : "text-blue-600"} font-mono font-bold`}>
                              {amount > 0 ? "+" : ""}
                              {formatCurrency(amount)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{revenueShare} от выручки</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="range" radius={[4, 4, 4, 4]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="animate-in slide-in-from-bottom duration-500 space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <FileText size={24} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Анализ состояния компании</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2 mb-4">
                    <TrendingUp size={20} />
                    Динамика
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    Выручка выросла на <strong>{revenueGrowth}%</strong> с {firstMonth.name} по {latestMonth.name}. Чистая прибыль за{" "}
                    {latestMonth.name}: <strong>{formatMillion(latestMonth.netProfit)}</strong>.
                  </p>
                </div>
                <div className="bg-fuchsia-50 border border-fuchsia-100 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-fuchsia-800 flex items-center gap-2 mb-4">
                    <CircleDollarSign size={20} />
                    Выплаты ТВ
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    По данным за {latestMonth.name}: общий доход ТВ <strong>{formatCurrency(latestMonth.tvIncome)}</strong>, из них
                    дивиденды <strong>{formatCurrency(latestMonth.tvDividends)}</strong>, прочие выплаты{" "}
                    <strong>{formatCurrency(latestMonth.tvOtherIncome)}</strong>.
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Info size={20} className="text-slate-500" />
                  Что это даёт
                </h3>
                <p className="text-slate-700">
                  Теперь дашборд берет цифры из Google Sheets. Вы обновляете отчёт в таблице, а сайт подтягивает изменения без
                  правки кода.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Месяц</th>
                <th className="px-6 py-4 font-bold">Выручка</th>
                <th className="px-6 py-4 font-bold">EBITDA</th>
                <th className="px-6 py-4 font-bold">Чистая прибыль</th>
                <th className="px-6 py-4 font-bold text-right">Доходы ТВ</th>
                <th className="px-6 py-4 font-bold text-right">Нераспределенная прибыль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.ebitda)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.netProfit)}</td>
                  <td className="px-6 py-4 text-right font-black text-fuchsia-600">{formatCurrency(row.tvIncome)}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">
                    {formatCurrency(row.netProfit - row.tvIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 mb-8 md:grid-cols-3">
              <Card title="Лучший продавец" value="Данные скоро появятся" subValue="Подключим продажи из Google Sheets" icon={Trophy} colorClass="bg-blue-500" />
              <Card title="Лучший бренд" value="Данные скоро появятся" subValue="Будет рейтинг брендов" icon={Tags} colorClass="bg-emerald-500" />
              <Card title="Лучший семинар" value="Данные скоро появятся" subValue="Будет аналитика семинаров" icon={FileText} colorClass="bg-amber-500" />
            </div>
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[500px]">
              {activeSalesTab === "brands" && (
                <BrandSalesAnalytics
                  brands={brandSalesData}
                  months={processedData}
                  latestMonth={latestMonth}
                  selectedBrandName={selectedBrandName}
                  onSelectBrand={setSelectedBrandName}
                />
              )}
              {activeSalesTab === "managers" && <PlaceholderChart title="Динамика продаж по менеджерам" />}
              {activeSalesTab === "seminars" && <PlaceholderChart title="Динамика продаж по семинарам" />}
              {activeSalesTab === "plan" && <PlaceholderChart title="План продаж" />}
            </div>
          </>
        )}
        </main>
      </div>
    </div>
  );
};

export default App;
