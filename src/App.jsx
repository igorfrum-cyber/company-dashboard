import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
} from "lucide-react";
import { FALLBACK_DATA } from "./data/fallbackData";
import { BRAND_SALES_DATA } from "./data/brandSalesData";
import { MANAGER_SALES_DATA } from "./data/managerSalesData";
import { loadDashboardDataFromGoogleSheets } from "./services/googleSheets";
import { OPEX_COLORS, TAX_COLORS } from "./utils/chartColors";
import { formatCurrency, formatMillion, formatRevenueShare } from "./utils/formatters";

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || "";

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
const MANAGER_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"];

const Card = ({ title, value, subValue, icon: Icon, colorClass, children }) => (
  <div className="flex min-h-[160px] flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:min-h-[180px] md:p-5">
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className={`shrink-0 rounded-xl p-2 md:p-3 ${colorClass}`}>
          <Icon size={20} className="text-white md:h-6 md:w-6" />
        </div>
        <span className="min-w-0 flex-1 break-words text-right text-[11px] font-bold uppercase leading-snug tracking-wider text-slate-400">
          {title}
        </span>
      </div>
      <div>
        <h3 className="break-words text-xl font-bold text-slate-800 md:text-2xl">{value}</h3>
        <div className="text-sm text-slate-500 mt-1">{subValue}</div>
      </div>
    </div>
    {children && <div className="mt-auto pt-3 md:pt-5">{children}</div>}
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
const getBrandMonthPlan = (brand, monthName) => brand.monthlySalesPlan?.[monthName] || brand.salesPlan || 0;

const BRAND_MONTH_ORDER = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const BRAND_MANAGER_FILTERS = ["", "Красина", "Травина", "Тарасевич"];

const formatOptionalCurrency = (value) => (value > 0 ? formatCurrency(value) : "—");

const getLatestBrandSales = (brand, months) => {
  for (let i = months.length - 1; i >= 0; i -= 1) {
    const value = getBrandMonthSales(brand, months[i].name);
    if (value > 0) {
      return value;
    }
  }

  return 0;
};

const BrandSalesAnalytics = ({
  brands,
  months,
  latestMonth,
  activeMonthName,
  onActiveMonthChange,
  selectedBrandName,
  expandedBrandName,
  onSelectBrand,
  onToggleExpandedBrand,
}) => {
  const graphRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const animationFrameRef = useRef(0);
  const settleTimerRef = useRef(0);
  const [highlightedBrandName, setHighlightedBrandName] = useState("");
  const [chartLag, setChartLag] = useState(0);
  const [selectedBrandManagerName, setSelectedBrandManagerName] = useState("");
  const [isPhone, setIsPhone] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const activeMonth = months.find((month) => month.name === activeMonthName) || latestMonth || months[months.length - 1];
  const activeRevenue = activeMonth?.revenue || 0;
  const selectedBrand = brands.find((brand) => brand.name === selectedBrandName);
  const toggleBrand = (brandName) => {
    setHighlightedBrandName(highlightedBrandName === brandName ? "" : brandName);
  };
  const showBrandChart = (brandName) => {
    setHighlightedBrandName(brandName);
    onSelectBrand(brandName);
  };
  const toggleExpandedBrand = (brandName) => {
    onToggleExpandedBrand(expandedBrandName === brandName ? "" : brandName);
    onSelectBrand("");
  };

  useEffect(() => {
    if (!months.length) {
      return;
    }

    const monthExists = months.some((month) => month.name === activeMonthName);
    if (!monthExists) {
      onActiveMonthChange(latestMonth?.name || months[months.length - 1].name);
    }
  }, [activeMonthName, latestMonth?.name, months, onActiveMonthChange]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updatePhoneMode = () => setIsPhone(mediaQuery.matches);

    updatePhoneMode();
    mediaQuery.addEventListener("change", updatePhoneMode);
    return () => mediaQuery.removeEventListener("change", updatePhoneMode);
  }, []);

  useEffect(() => {
    if (selectedBrandName) {
      graphRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedBrandName]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    let targetLag = 0;
    let currentLag = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const animateLag = () => {
      currentLag += (targetLag - currentLag) * 0.18;
      if (Math.abs(targetLag - currentLag) < 0.25) {
        currentLag = targetLag;
      }

      setChartLag(Number(currentLag.toFixed(1)));

      if (currentLag !== targetLag) {
        animationFrameRef.current = window.requestAnimationFrame(animateLag);
      } else {
        animationFrameRef.current = 0;
      }
    };
    const startLagAnimation = () => {
      if (!animationFrameRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(animateLag);
      }
    };
    const handleScroll = () => {
      if (!mediaQuery.matches || selectedBrandName) {
        targetLag = 0;
        startLagAnimation();
        return;
      }

      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      targetLag = clamp(delta * 0.45, -12, 30);
      startLagAnimation();

      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        targetLag = 0;
        startLagAnimation();
      }, 140);
    };
    const handleMediaChange = () => {
      if (!mediaQuery.matches) {
        targetLag = 0;
        currentLag = 0;
        setChartLag(0);
      }
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.clearTimeout(settleTimerRef.current);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedBrandName]);

  const rows = brands
    .map((brand, index) => ({
      ...brand,
      color: BRAND_COLORS[index % BRAND_COLORS.length],
      latestFact: getBrandMonthSales(brand, activeMonth.name) || getLatestBrandSales(brand, months),
      salesPlan: getBrandMonthPlan(brand, activeMonth.name),
    }))
    .sort((a, b) => b.latestFact - a.latestFact);

  const chartData = rows.filter((brand) => brand.latestFact > 0);
  const filteredRows = rows.filter((brand) => brand.name.toLowerCase().includes(brandSearchQuery.trim().toLowerCase()));
  const trendData = selectedBrand
    ? months.map((month) => {
        const value = selectedBrandManagerName
          ? selectedBrand.managerMonthlySales?.[selectedBrandManagerName]?.[month.name] || 0
          : getBrandMonthSales(selectedBrand, month.name);
        return {
          name: month.name,
          sales: value,
          revenueShare: month.revenue ? Number(((value / month.revenue) * 100).toFixed(1)) : 0,
        };
      })
    : [];

  if (!brands.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Tags className="mx-auto mb-4 text-slate-300" size={36} />
        <h2 className="text-xl font-bold text-slate-800">Бренды не загружены</h2>
        <p className="mt-2 text-sm text-slate-500">Проверьте локальный файл с данными брендов.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:overflow-visible">
          {months.map((month) => (
            <button
              key={month.name}
              type="button"
              onClick={() => onActiveMonthChange(month.name)}
              className={`min-w-32 shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors md:min-w-0 md:flex-1 ${
                activeMonth.name === month.name
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {month.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="rounded-2xl bg-white p-3 md:p-5 xl:sticky xl:top-6 xl:self-start">
          <div
            className="transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${chartLag}px)` }}
          >
          <div className="mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Продажи брендов: {activeMonth.name}</h2>
              <p className="text-sm text-slate-500">Доля считается от общей выручки месяца.</p>
            </div>
          </div>
          <div className="h-[240px] md:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isPhone ? 58 : 105}
                  outerRadius={isPhone ? 100 : 180}
                  paddingAngle={3}
                  dataKey="latestFact"
                  onClick={(entry) => toggleBrand(entry.name)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={highlightedBrandName === entry.name ? "#0f172a" : "#ffffff"}
                      strokeWidth={highlightedBrandName === entry.name ? 3 : 2}
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
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="shrink-0 text-slate-400" size={20} />
            <input
              type="search"
              value={brandSearchQuery}
              onChange={(event) => setBrandSearchQuery(event.target.value)}
              placeholder="Найти бренд"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </label>
          {filteredRows.map((brand) => {
            const isHighlighted = highlightedBrandName === brand.name;
            const share = activeRevenue ? ((brand.latestFact / activeRevenue) * 100).toFixed(1) : "0.0";
            const isPlanDone = brand.salesPlan > 0 && brand.latestFact >= brand.salesPlan;
            const factColorClass =
              brand.salesPlan <= 0 ? "text-slate-900" : isPlanDone ? "text-emerald-600" : "text-red-500";

            return (
              <div
                key={brand.name}
                role="button"
                tabIndex={0}
                onClick={() => toggleBrand(brand.name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleBrand(brand.name);
                  }
                }}
                className={`grid w-full grid-cols-2 gap-x-3 gap-y-3 rounded-2xl p-4 text-left transition-colors md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-4 ${
                  isHighlighted ? "bg-blue-50 ring-2 ring-blue-200" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1 md:gap-4">
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: brand.color }} />
                  <span className="min-w-0 break-words text-base font-black text-slate-800 md:text-lg">{brand.name}</span>
                  {isHighlighted && (
                    <button
                      type="button"
                      aria-label={`Показать график: ${brand.name}`}
                      title="Показать график"
                      onClick={(event) => {
                        event.stopPropagation();
                        showBrandChart(brand.name);
                      }}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      <TrendingUp size={20} />
                    </button>
                  )}
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">План</div>
                  <div className="text-base font-black text-slate-700">{formatOptionalCurrency(brand.salesPlan)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">Факт</div>
                  <div className={`text-lg font-black ${factColorClass}`}>{formatCurrency(brand.latestFact)}</div>
                  <div className="text-sm font-semibold text-slate-400">{share}% от выручки</div>
                </div>
              </div>
            );
          })}
          {!filteredRows.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              Бренды не найдены
            </div>
          )}
        </div>
      </div>

      {selectedBrand && (
        <div ref={graphRef} className="rounded-2xl border border-slate-100 bg-white p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Динамика продаж: {selectedBrand.name}</h3>
              <p className="text-sm text-slate-500">
                Столбцы показывают продажи {selectedBrandManagerName ? `менеджера ${selectedBrandManagerName}` : "бренда"}, линия
                — процент от выручки.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectBrand("")}
              className="self-start rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 md:self-auto"
            >
              Скрыть график
            </button>
          </div>
          <div className="mb-6 flex w-full flex-nowrap gap-3 overflow-x-auto pb-1">
            {BRAND_MANAGER_FILTERS.map((managerName) => (
              <button
                key={managerName || "all"}
                type="button"
                onClick={() => setSelectedBrandManagerName(managerName)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                  selectedBrandManagerName === managerName
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {managerName || "Все менеджеры"}
              </button>
            ))}
          </div>
          <div className="h-[300px] w-full md:h-[360px]">
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

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-4 font-bold">Бренд</th>
              <th className="px-5 py-4 font-bold text-right">План выкупа у поставщика</th>
              <th className="px-5 py-4 font-bold text-right">План продаж</th>
              <th className="px-5 py-4 font-bold text-right">Факт продаж за {activeMonth.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((brand) => {
              const isExpanded = expandedBrandName === brand.name;
              const isPlanDone = brand.salesPlan > 0 && brand.latestFact >= brand.salesPlan;
              const factColorClass =
                brand.salesPlan <= 0 ? "text-blue-600" : isPlanDone ? "text-emerald-600" : "text-red-500";

              return (
                <React.Fragment key={brand.name}>
                  <tr
                    onClick={() => toggleExpandedBrand(brand.name)}
                    className={`cursor-pointer transition-colors ${isExpanded ? "bg-blue-50" : "hover:bg-slate-50/70"}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-slate-500 transition-transform ${
                            isExpanded ? "rotate-180 border-blue-200 bg-white text-blue-600" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <ChevronDown size={16} />
                        </span>
                        <span className="font-bold text-slate-800">{brand.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600">{formatOptionalCurrency(brand.purchasePlan)}</td>
                    <td className="px-5 py-4 text-right text-slate-600">{formatOptionalCurrency(brand.salesPlan)}</td>
                    <td className={`px-5 py-4 text-right font-black ${factColorClass}`}>{formatCurrency(brand.latestFact)}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-50/50">
                      <td colSpan={4} className="px-5 pb-5 pt-0">
                        <div className="rounded-2xl border border-blue-100 bg-white p-4">
                          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div>
                              <div className="text-sm font-bold text-slate-800">Продажи по месяцам</div>
                              <div className="text-xs font-semibold text-slate-400">{brand.name}</div>
                              </div>
                              <button
                                type="button"
                                aria-label={`Показать график: ${brand.name}`}
                                title="Показать график"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  showBrandChart(brand.name);
                                }}
                                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                                  selectedBrandName === brand.name
                                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                              >
                                <TrendingUp size={20} />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {months.map((month) => (
                              <div key={month.name} className="rounded-xl bg-slate-50 px-4 py-3">
                                <div className="text-xs font-black uppercase tracking-wider text-slate-400">{month.name}</div>
                                <div className="mt-1 text-base font-black text-slate-800">
                                  {formatCurrency(getBrandMonthSales(brand, month.name))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ManagerSalesAnalytics = ({ managers, months, activeMonthName, onActiveMonthChange }) => {
  const graphRef = useRef(null);
  const [highlightedManagerName, setHighlightedManagerName] = useState("");
  const [expandedManagerName, setExpandedManagerName] = useState("");
  const [selectedManagerName, setSelectedManagerName] = useState("");
  const activeMonth = months.find((month) => month.name === activeMonthName) || months[months.length - 1];
  const activeRevenue = activeMonth?.revenue || 0;
  const toggleManager = (managerName) => {
    setHighlightedManagerName(highlightedManagerName === managerName ? "" : managerName);
  };
  const showManagerChart = (managerName) => {
    setHighlightedManagerName(managerName);
    setSelectedManagerName(managerName);
  };
  const toggleExpandedManager = (managerName) => {
    setExpandedManagerName(expandedManagerName === managerName ? "" : managerName);
  };

  const rows = managers
    .map((manager, index) => {
      const sales = getBrandMonthSales(manager, activeMonth.name);
      const plan = manager.monthlyPlan?.[activeMonth.name] || 0;
      return {
        ...manager,
        color: MANAGER_COLORS[index % MANAGER_COLORS.length],
        sales,
        plan,
        kpis: manager.monthlyKpis?.[activeMonth.name] || [],
        planCompletion: plan ? Number(((sales / plan) * 100).toFixed(1)) : 0,
        revenueShare: activeRevenue ? Number(((sales / activeRevenue) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  const chartData = rows.filter((manager) => manager.sales > 0);
  const trendData = months.map((month) => {
    const row = { name: month.name };
    managers.forEach((manager) => {
      row[manager.name] = getBrandMonthSales(manager, month.name);
    });
    return row;
  });
  const selectedManager = managers.find((manager) => manager.name === selectedManagerName);
  const selectedTrendData = selectedManager
    ? months.map((month) => {
        const sales = getBrandMonthSales(selectedManager, month.name);
        return {
          name: month.name,
          sales,
          revenueShare: month.revenue ? Number(((sales / month.revenue) * 100).toFixed(1)) : 0,
        };
      })
    : [];

  useEffect(() => {
    if (selectedManagerName) {
      graphRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedManagerName]);

  if (!managers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <Users className="mx-auto mb-4 text-slate-300" size={36} />
        <h2 className="text-xl font-bold text-slate-800">Менеджеры не загружены</h2>
        <p className="mt-2 text-sm text-slate-500">Проверьте локальный файл с данными менеджеров.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:overflow-visible">
          {months.map((month) => (
            <button
              key={month.name}
              type="button"
              onClick={() => onActiveMonthChange(month.name)}
              className={`min-w-32 shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors md:min-w-0 md:flex-1 ${
                activeMonth.name === month.name
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {month.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(680px,1.25fr)]">
        <div className="rounded-2xl bg-white p-3 md:p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">Продажи менеджеров: {activeMonth.name}</h2>
            <p className="text-sm text-slate-500">Доля считается от общей выручки тюменского офиса.</p>
          </div>
          <div className="h-[320px] md:h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={105}
                  outerRadius={180}
                  paddingAngle={3}
                  dataKey="sales"
                  onClick={(entry) => toggleManager(entry.name)}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke={highlightedManagerName === entry.name ? "#0f172a" : "#ffffff"}
                      strokeWidth={highlightedManagerName === entry.name ? 3 : 2}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), "Продажи"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((manager) => {
            const isHighlighted = highlightedManagerName === manager.name;
            const isExpanded = expandedManagerName === manager.name;
            const hasKpis = manager.kpis.length > 0;
            const isPlanDone = manager.plan > 0 && manager.sales >= manager.plan;
            const factColorClass =
              manager.plan <= 0 ? "text-slate-900" : isPlanDone ? "text-emerald-600" : "text-red-500";

            return (
              <React.Fragment key={manager.name}>
                <div
                  className={`relative grid w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
                    manager.plan > 0
                      ? "grid-cols-2 md:grid-cols-[minmax(190px,1fr)_135px_175px]"
                      : "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(190px,1fr)_175px]"
                  } ${isHighlighted ? "bg-blue-50 ring-2 ring-blue-200" : "bg-slate-50 hover:bg-slate-100"}`}
                >
                  <button
                    type="button"
                    aria-label={`Выбрать менеджера: ${manager.name}`}
                    title={`Выбрать менеджера: ${manager.name}`}
                    onClick={() => toggleManager(manager.name)}
                    className="absolute inset-0 z-0 rounded-2xl"
                  />
                  <div className={`pointer-events-none relative z-10 flex min-w-0 items-center gap-3 ${manager.plan > 0 ? "col-span-2 md:col-span-1" : ""}`}>
                    {hasKpis && (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? "Скрыть" : "Показать"} KPI: ${manager.name}`}
                        title={`${isExpanded ? "Скрыть" : "Показать"} KPI`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpandedManager(manager.name);
                        }}
                        className={`pointer-events-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-slate-500 transition-transform ${
                          isExpanded ? "rotate-180 border-blue-200 bg-white text-blue-600" : "border-slate-200 bg-white"
                        }`}
                      >
                        <ChevronDown size={17} />
                      </button>
                    )}
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: manager.color }} />
                    <span className="min-w-0 truncate text-base font-black text-slate-800">{manager.name}</span>
                    {isHighlighted && (
                      <button
                        type="button"
                        aria-label={`Показать график: ${manager.name}`}
                        title="Показать график"
                        onMouseDown={(event) => {
                          event.stopPropagation();
                          showManagerChart(manager.name);
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        className="pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
                      >
                        <TrendingUp size={20} />
                      </button>
                    )}
                  </div>
                  {manager.plan > 0 && (
                    <div className="pointer-events-none relative z-10 shrink-0 text-right">
                      <div className="text-xs font-black uppercase tracking-wider text-slate-400">План</div>
                      <div className="text-base font-black text-slate-700">{formatCurrency(manager.plan)}</div>
                      <div className="text-xs font-semibold text-slate-400">{manager.planCompletion}% выполнения</div>
                    </div>
                  )}
                  <div className="pointer-events-none relative z-10 shrink-0 text-right">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-400">Факт</div>
                    <div className={`text-base font-black ${factColorClass}`}>{formatCurrency(manager.sales)}</div>
                    <div className="text-xs font-semibold text-slate-400">{manager.revenueShare}% от выручки офиса</div>
                  </div>
                </div>
                {hasKpis && isExpanded && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="mb-3 text-sm font-bold text-slate-800">KPI за апрель: {manager.name}</div>
                    <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-3">KPI</th>
                            <th className="px-4 py-3 text-right">План</th>
                            <th className="px-4 py-3 text-right">Факт</th>
                            <th className="px-4 py-3 text-right">Выполнение</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manager.kpis.map((kpi) => {
                            const isKpiDone = kpi.fact >= kpi.plan;
                            return (
                              <tr key={kpi.name}>
                                <td className="px-4 py-3 font-bold text-slate-800">{kpi.name}</td>
                                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(kpi.plan)}</td>
                                <td className={`px-4 py-3 text-right font-black ${isKpiDone ? "text-emerald-600" : "text-red-500"}`}>
                                  {formatCurrency(kpi.fact)}
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${isKpiDone ? "text-emerald-600" : "text-red-500"}`}>
                                  {kpi.plan ? ((kpi.fact / kpi.plan) * 100).toFixed(1) : "0.0"}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {selectedManager && (
        <div ref={graphRef} className="rounded-2xl border border-slate-100 bg-white p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Динамика продаж: {selectedManager.name}</h3>
              <p className="text-sm text-slate-500">Столбцы показывают продажи менеджера, линия — долю от выручки офиса.</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedManagerName("")}
              className="self-start rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 md:self-auto"
            >
              Скрыть график
            </button>
          </div>
          <div className="h-[300px] w-full md:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={selectedTrendData}>
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
                <Bar yAxisId="left" dataKey="sales" name="Продажи менеджера" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={70} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenueShare"
                  name="% от выручки офиса"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 6, fill: "#f59e0b" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-4 md:p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Динамика продаж менеджеров</h3>
          <p className="text-sm text-slate-500">Сравнение продаж по месяцам для всех менеджеров.</p>
        </div>
        <div className="h-[300px] w-full md:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} dy={10} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b" }}
                tickFormatter={(value) => `${(value / 1e6).toFixed(1)}M`}
              />
              <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
              {managers.map((manager, index) => (
                <Bar
                  key={manager.name}
                  dataKey={manager.name}
                  name={manager.name}
                  fill={MANAGER_COLORS[index % MANAGER_COLORS.length]}
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
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
  const [brandSalesData] = useState(BRAND_SALES_DATA);
  const [managerSalesData] = useState(MANAGER_SALES_DATA);
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [expandedBrandName, setExpandedBrandName] = useState("");
  const [activeBrandMonthName, setActiveBrandMonthName] = useState("");
  const [activeManagerMonthName, setActiveManagerMonthName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(FALLBACK_DATA[FALLBACK_DATA.length - 1]);
  const [cardMonths, setCardMonths] = useState({
    revenue: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
    profit: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
    expenses: FALLBACK_DATA[FALLBACK_DATA.length - 1].name,
  });
  const [expenseTrendSelection, setExpenseTrendSelection] = useState(null);
  const [loading, setLoading] = useState(Boolean(SHEET_ID));
  const [error, setError] = useState("");
  const [sourceMode, setSourceMode] = useState(SHEET_ID ? "google" : "fallback");

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

  const firstMonth = processedData[0];
  const latestMonth = processedData[processedData.length - 1];
  const brandMonths = useMemo(() => {
    const availableMonthNames = BRAND_MONTH_ORDER.filter((monthName) =>
      brandSalesData.some((brand) => Object.prototype.hasOwnProperty.call(brand.monthlySales || {}, monthName)),
    );

    return availableMonthNames.map((monthName) => processedData.find((month) => month.name === monthName) || { name: monthName, revenue: 0 });
  }, [brandSalesData, processedData]);
  const latestBrandMonth = brandMonths[brandMonths.length - 1] || latestMonth;
  const activeBrandMonth = brandMonths.find((month) => month.name === activeBrandMonthName) || latestBrandMonth;
  const managerMonths = useMemo(() => {
    const availableMonthNames = BRAND_MONTH_ORDER.filter((monthName) =>
      managerSalesData.some((manager) => Object.prototype.hasOwnProperty.call(manager.monthlySales || {}, monthName)),
    );

    return availableMonthNames.map((monthName) => processedData.find((month) => month.name === monthName) || { name: monthName, revenue: 0 });
  }, [managerSalesData, processedData]);
  const latestManagerMonth = managerMonths[managerMonths.length - 1] || latestMonth;
  const activeManagerMonth = managerMonths.find((month) => month.name === activeManagerMonthName) || latestManagerMonth;
  const bestBrand = useMemo(() => {
    if (!brandSalesData.length || !activeBrandMonth) {
      return null;
    }

    return brandSalesData
      .map((brand) => {
        const sales = getBrandMonthSales(brand, activeBrandMonth.name);
        const revenueShare = activeBrandMonth.revenue ? (sales / activeBrandMonth.revenue) * 100 : 0;

        return {
          ...brand,
          sales,
          revenueShare,
        };
      })
      .sort((a, b) => b.revenueShare - a.revenueShare || b.sales - a.sales)[0];
  }, [activeBrandMonth, brandSalesData]);
  const bestManager = useMemo(() => {
    if (!managerSalesData.length || !activeManagerMonth) {
      return null;
    }

    return managerSalesData
      .map((manager) => {
        const sales = getBrandMonthSales(manager, activeManagerMonth.name);
        const revenueShare = activeManagerMonth.revenue ? (sales / activeManagerMonth.revenue) * 100 : 0;

        return {
          ...manager,
          sales,
          revenueShare,
        };
      })
      .sort((a, b) => b.sales - a.sales)[0];
  }, [activeManagerMonth, managerSalesData]);

  useEffect(() => {
    if (!brandMonths.length) {
      return;
    }

    const monthExists = brandMonths.some((month) => month.name === activeBrandMonthName);
    if (!monthExists) {
      setActiveBrandMonthName(latestBrandMonth.name);
    }
  }, [activeBrandMonthName, brandMonths, latestBrandMonth.name]);

  useEffect(() => {
    if (!managerMonths.length) {
      return;
    }

    const monthExists = managerMonths.some((month) => month.name === activeManagerMonthName);
    if (!monthExists) {
      setActiveManagerMonthName(latestManagerMonth.name);
    }
  }, [activeManagerMonthName, latestManagerMonth.name, managerMonths]);

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
        <header className="mb-6 flex flex-col justify-between gap-4 md:mb-8 xl:flex-row xl:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black leading-tight text-slate-900 md:text-3xl md:leading-normal">
              <LayoutDashboard className="shrink-0 text-blue-600" />
              {portalMode === "finances" ? "Финансовый дашборд компании" : "Продажи и аналитика"}
            </h1>
            <p className="text-slate-500 mt-1">
              {portalMode === "finances"
                ? `Источник: ${sourceMode === "google" ? "Google Sheets" : "Демо-данные"}`
                : "Источник продаж: локальный файл брендов"}
            </p>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
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

        {portalMode === "finances" ? (
          <>
        <div className={`${activeTab === "overview" ? "grid" : "hidden md:grid"} mb-8 grid-cols-2 gap-3 [&>*:last-child]:col-span-2 md:gap-5 xl:grid-cols-5 xl:[&>*:last-child]:col-span-1`}>
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

        <div className="min-h-[500px] rounded-3xl border border-slate-100 bg-white p-3 shadow-sm md:p-8">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Рост бизнеса и эффективность</h2>
              </div>
              <div className="h-[300px] w-full md:h-[400px]">
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
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex w-full flex-nowrap gap-3 overflow-x-auto md:overflow-visible">
                  {processedData.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedMonth(m)}
                      className={`min-w-32 shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors md:min-w-0 md:flex-1 ${
                        selectedMonth.name === m.name ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold">Расшифровка расходов и налогов</h2>
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
                <div className="h-[300px] w-full md:h-[360px]">
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
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
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
              <div className="h-[300px] w-full md:h-[400px]">
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

        <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-[760px] w-full border-collapse text-left text-sm">
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
            {activeSalesTab !== "plan" && (
              <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                {activeSalesTab === "managers" && (
                  <Card
                    title={`Лучший продавец (${activeManagerMonth.name})`}
                    value={bestManager?.name || "Данные скоро появятся"}
                    subValue={
                      bestManager
                        ? `${formatCurrency(bestManager.sales)} · ${bestManager.revenueShare.toFixed(1)}% от выручки`
                        : "Подключим рейтинг продавцов"
                    }
                    icon={Trophy}
                    colorClass="bg-blue-500"
                  />
                )}
                {activeSalesTab === "brands" && (
                  <Card
                    title={`Лучший бренд (${activeBrandMonth.name})`}
                    value={bestBrand?.name || "Данные скоро появятся"}
                    subValue={
                      bestBrand
                        ? `${formatCurrency(bestBrand.sales)} · ${bestBrand.revenueShare.toFixed(1)}% от выручки`
                        : "Будет рейтинг брендов"
                    }
                    icon={Tags}
                    colorClass="bg-emerald-500"
                  />
                )}
                {activeSalesTab === "seminars" && (
                  <Card title="Лучший семинар" value="Данные скоро появятся" subValue="Будет аналитика семинаров" icon={FileText} colorClass="bg-amber-500" />
                )}
              </div>
            )}
            <div className="min-h-[500px] rounded-3xl border border-slate-100 bg-white p-3 shadow-sm md:p-8">
              {activeSalesTab === "brands" && (
                <BrandSalesAnalytics
                  brands={brandSalesData}
                  months={brandMonths}
                  latestMonth={latestBrandMonth}
                  activeMonthName={activeBrandMonth.name}
                  onActiveMonthChange={setActiveBrandMonthName}
                  selectedBrandName={selectedBrandName}
                  expandedBrandName={expandedBrandName}
                  onSelectBrand={setSelectedBrandName}
                  onToggleExpandedBrand={setExpandedBrandName}
                />
              )}
              {activeSalesTab === "managers" && (
                <ManagerSalesAnalytics
                  managers={managerSalesData}
                  months={managerMonths}
                  activeMonthName={activeManagerMonth.name}
                  onActiveMonthChange={setActiveManagerMonthName}
                />
              )}
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
