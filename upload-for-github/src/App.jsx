import React, { useState, useMemo } from "react";
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
  Users,
} from "lucide-react";

const rawData = [
  {
    name: "Январь",
    revenue: 16806686.01,
    grossProfit: 4728318.56,
    ebitda: 3017634.15,
    netProfit: 1464297.11,
    opexDetails: {
      salaries: 857264.0,
      delivery: 90287.89,
      other: 763132.52,
    },
  },
  {
    name: "Февраль",
    revenue: 22160834.89,
    grossProfit: 6824588.27,
    ebitda: 4542495.9,
    netProfit: 2537712.86,
    opexDetails: {
      salaries: 1140000.0,
      delivery: 125000.0,
      other: 1017092.37,
    },
  },
  {
    name: "Март",
    revenue: 25288957.5,
    grossProfit: 8030483.7,
    ebitda: 5553241.95,
    netProfit: 3368731.77,
    opexDetails: {
      salaries: 1280000.0,
      delivery: 148000.0,
      other: 1049241.75,
    },
  },
];

const processedData = rawData.map((item) => ({
  ...item,
  cogs: item.revenue - item.grossProfit,
  opex: item.grossProfit - item.ebitda,
  taxes: item.ebitda - item.netProfit,
  ebitdaMargin: Number(((item.ebitda / item.revenue) * 100).toFixed(1)),
  netMargin: Number(((item.netProfit / item.revenue) * 100).toFixed(1)),
}));

const formatCurrency = (val) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(val);

const formatMillion = (val) => `${(val / 1000000).toFixed(2)} млн`;

const App = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState(processedData[2]);

  const waterfallData = useMemo(() => {
    const d = selectedMonth;
    return [
      { name: "Выручка", range: [0, d.revenue], color: "#3b82f6", value: d.revenue },
      {
        name: "Себестоимость",
        range: [d.grossProfit, d.revenue],
        color: "#ef4444",
        value: -d.cogs,
      },
      { name: "Вал. прибыль", range: [0, d.grossProfit], color: "#6366f1", value: d.grossProfit },
      {
        name: "Опер. расходы",
        range: [d.ebitda, d.grossProfit],
        color: "#f59e0b",
        value: -d.opex,
      },
      { name: "EBITDA", range: [0, d.ebitda], color: "#10b981", value: d.ebitda },
      {
        name: "Налоги/аморт.",
        range: [d.netProfit, d.ebitda],
        color: "#6b7280",
        value: -d.taxes,
      },
      { name: "Чистая прибыль", range: [0, d.netProfit], color: "#059669", value: d.netProfit },
    ];
  }, [selectedMonth]);

  const opexBreakdown = useMemo(() => {
    const d = selectedMonth.opexDetails;
    return [
      { name: "Зарплаты", value: d.salaries, color: "#4f46e5" },
      { name: "Доставка", value: d.delivery, color: "#06b6d4" },
      { name: "Прочие OpEx", value: d.other, color: "#94a3b8" },
    ];
  }, [selectedMonth]);

  const Card = ({ title, value, subValue, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>
          <Icon size={24} className="text-white" />
        </div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <p className="text-sm text-slate-500 mt-1">{subValue}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="text-blue-600" />
              Финансовый дашборд компании
            </h1>
            <p className="text-slate-500 mt-1">Интерактивный отчет по динамике, расходам и маржинальности</p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
            {[
              { id: "overview", label: "Обзор", icon: TrendingUp },
              { id: "structure", label: "Расходы", icon: PieChartIcon },
              { id: "waterfall", label: "Детализация", icon: ArrowDownRight },
              { id: "analysis", label: "Анализ", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card
            title="Выручка"
            value={formatMillion(processedData[2].revenue)}
            subValue={`+${((processedData[2].revenue / processedData[0].revenue - 1) * 100).toFixed(0)}% с января`}
            icon={DollarSign}
            colorClass="bg-blue-500"
          />
          <Card
            title="ФОТ (Март)"
            value={formatCurrency(processedData[2].opexDetails.salaries)}
            subValue={`${((processedData[2].opexDetails.salaries / processedData[2].opex) * 100).toFixed(0)}% от OpEx`}
            icon={Users}
            colorClass="bg-indigo-500"
          />
          <Card
            title="Чистая прибыль"
            value={formatMillion(processedData[2].netProfit)}
            subValue={`Чистая маржа ${processedData[2].netMargin}%`}
            icon={Zap}
            colorClass="bg-emerald-500"
          />
          <Card
            title="Рентабельность"
            value={`${processedData[2].ebitdaMargin}%`}
            subValue="Маржа EBITDA"
            icon={Percent}
            colorClass="bg-amber-500"
          />
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[500px]">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Рост бизнеса и эффективность</h2>
                <div className="flex gap-4 text-xs font-semibold uppercase text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>Выручка
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>EBITDA
                  </span>
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b" }} dy={10} />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b" }}
                      tickFormatter={(v) => `${v / 1e6}M`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b" }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value, name) => [name.includes("%") ? `${value}%` : formatCurrency(value), name]}
                    />
                    <Bar yAxisId="left" dataKey="revenue" name="Выручка" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={60} />
                    <Bar yAxisId="left" dataKey="ebitda" name="EBITDA" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="ebitdaMargin"
                      name="Рентабельность EBITDA %"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 6, fill: "#059669" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "structure" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Расшифровка операционных расходов (OpEx)</h2>
                <div className="flex gap-2">
                  {processedData.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        selectedMonth.name === m.name
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={opexBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {opexBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-700">Статьи за {selectedMonth.name}</h3>
                  {opexBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-slate-400">
                          {((item.value / selectedMonth.opex) * 100).toFixed(1)}% от расходов
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-200 flex justify-between font-black text-slate-800">
                    <span>ИТОГО OpEx</span>
                    <span>{formatCurrency(selectedMonth.opex)}</span>
                  </div>
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
                        selectedMonth.name === m.name
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100">
                              <p className="font-bold text-slate-800">{data.name}</p>
                              <p className={`${data.value < 0 ? "text-red-500" : "text-blue-600"} font-mono font-bold`}>
                                {data.value > 0 ? "+" : ""}
                                {formatCurrency(data.value)}
                              </p>
                            </div>
                          );
                        }
                        return null;
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
                    Динамика и масштабирование
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    Выручка показала рост на <strong>50.5%</strong> за квартал. Ключевой успех в опережающем росте прибыли.
                    В марте компания сгенерировала <strong>3.36 млн руб</strong> чистой прибыли, что в <strong>2.3 раза</strong>{" "}
                    больше январского результата. Бизнес эффективно переваривает рост объемов.
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2 mb-4">
                    <Users size={20} />
                    Управление расходами (OpEx)
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    Основной статьей операционных затрат являются <strong>зарплаты сотрудников</strong> (~51% от всех OpEx). В
                    марте ФОТ составил <strong>1.28 млн руб</strong>. Затраты на доставку составляют около <strong>6%</strong> от
                    операционки. Структура расходов стабильна, резких перекосов при росте выручки не наблюдается.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <Info size={20} className="text-slate-500" />
                  Резюме для принятия решений
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0"></div>
                    <p className="text-slate-700">
                      <strong>Эффективность персонала:</strong> выручка на одного менеджера растет, так как ФОТ увеличивается
                      медленнее, чем продажи.
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <p className="text-slate-700">
                      <strong>Маржинальность:</strong> валовая рентабельность держится на уровне 28-32%. Основной ресурс роста
                      прибыли это контроль закупочных цен (COGS).
                    </p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                    <p className="text-slate-700">
                      <strong>Логистика:</strong> доставка покупателям (148k в марте) контролируема, ее доля в выручке менее 1%,
                      что является отличным показателем.
                    </p>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center pt-4">
                <div className="bg-emerald-100 text-emerald-800 px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm border border-emerald-200">
                  <Zap size={18} />
                  Статус: финансовое здоровье компании отличное.
                </div>
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
                <th className="px-6 py-4 font-bold">Зарплаты (OpEx)</th>
                <th className="px-6 py-4 font-bold">EBITDA</th>
                <th className="px-6 py-4 font-bold text-right">Чистая прибыль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.revenue)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.opexDetails.salaries)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(row.ebitda)}</td>
                  <td className="px-6 py-4 text-right font-black text-blue-600">{formatCurrency(row.netProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
