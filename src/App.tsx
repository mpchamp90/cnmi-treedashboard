import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Map, Sprout, Activity, Settings, Trees, Wind, PieChart, RefreshCw, Menu, BarChart3, Layers, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
const SHEET_ID = "1JRPKppFO8s41gTIM26xZLojsaij-eQG2qo-mhwAg1qg";
const GID_SUMMARY = "1289823245"; // หน้า Summary
const SPECIES_RANGE = "H8:I"; // ตารางชนิดพันธุ์ไม้ (H=ชื่อ, I=จำนวน)

// --- UTILITIES (Logic จากโค้ดเดิมของคุณ) ---
function gvizUrl(gid: string, range: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&range=${encodeURIComponent(range)}`;
}

function parseGviz(text) {
  const prefix = "/*O_o*/";
  const start = text.indexOf(prefix);
  if (start === -1) throw new Error("Unexpected GViz response");
  // ใช้ Logic ตัดคำตามเดิม
  const jsonStr = text.substring(start + 47, text.length - 2);
  try {
    const json = JSON.parse(jsonStr);
    return json?.table;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return null;
  }
}

const normalizeNumerals = (s) =>
  String(s)
    .replace(/๐/g, "0").replace(/๑/g, "1").replace(/๒/g, "2")
    .replace(/๓/g, "3").replace(/๔/g, "4").replace(/๕/g, "5")
    .replace(/๖/g, "6").replace(/๗/g, "7").replace(/๘/g, "8")
    .replace(/๙/g, "9");

function toNumber(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = normalizeNumerals(String(raw)).replace(/[^0-9.\-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// --- COMPONENTS ---

const Sidebar = ({ isOpen, toggleSidebar, activeMenu, setActiveMenu }) => {
  const menuItems = [
    { id: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: 'inventory', label: 'ข้อมูลรายชนิด', icon: Trees },
    { id: 'map', label: 'แผนที่ Google Earth', icon: Map },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={toggleSidebar} />}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 z-30 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Sprout size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800 tracking-tight">CNMI Tree</h1>
            <p className="text-xs text-gray-500">Live Inventory</p>
          </div>
        </div>
        <nav className="mt-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeMenu === item.id ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <item.icon size={20} className={activeMenu === item.id ? 'text-emerald-500' : 'text-gray-400'} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

const StatCard = ({ title, value, unit, subtext, icon: Icon, colorClass, loading }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
          <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        {loading ? (
          <div className="h-9 w-24 bg-gray-200 animate-pulse rounded-lg"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-800 animate-in fade-in">{value != null ? value.toLocaleString() : '-'}</p>
        )}
        <span className="text-sm text-gray-400 font-medium">{unit}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
  </div>
);

// --- MAIN LOGIC ---

const DashboardContent = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('-');
  const [data, setData] = useState({
    totalCount: null,
    measured: null,
    totalCO2eTon: null,
    avgDBHcm: null,
    avgPerTreeKg: null,
    topSpeciesName: null,
    topSpeciesCount: null,
  });
  const [species, setSpecies] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) ดึงข้อมูล KPI จาก A3:Z3
      const rowUrl = gvizUrl(GID_SUMMARY, "A3:Z3");
      const rowTxt = await fetch(rowUrl).then(r => r.text());
      const rowTable = parseGviz(rowTxt);
      const row = rowTable?.rows?.[0];

      if (!row) throw new Error("ไม่พบข้อมูลในแถว A3:Z3");

      const getCell = (i) => row.c?.[i]?.v ?? row.c?.[i]?.f ?? null;
      
      const cellH3 = getCell(7);
      const H3name = cellH3 == null ? null : typeof cellH3 === "string" ? cellH3 : String(cellH3);

      setData({
        totalCount: toNumber(getCell(0)), // A3
        measured: toNumber(getCell(1)),   // B3
        totalCO2eTon: toNumber(getCell(2)), // C3
        avgDBHcm: toNumber(getCell(3)),    // D3
        avgPerTreeKg: toNumber(getCell(4)), // E3
        topSpeciesName: H3name, // H3
        topSpeciesCount: toNumber(getCell(8)), // I3
      });

      // 2) ดึงข้อมูลพันธุ์ไม้จาก H8:I
      const spUrl = gvizUrl(GID_SUMMARY, SPECIES_RANGE);
      const spTxt = await fetch(spUrl).then(r => r.text());
      const spTable = parseGviz(spTxt);
      
      const rows = (spTable?.rows ?? [])
        .map(r => {
          const nameRaw = r?.c?.[0]?.v ?? r?.c?.[0]?.f ?? "";
          const cntRaw = r?.c?.[1]?.v ?? r?.c?.[1]?.f ?? null;
          const name = String(nameRaw).trim();
          const count = toNumber(cntRaw);
          return name && count != null ? { name, count } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.count - a.count);

      setSpecies(rows);
      setLastUpdated(new Date().toLocaleTimeString('th-TH'));
    } catch (e) {
      console.error("Fetch Error:", e);
      setError("ไม่สามารถดึงข้อมูลได้: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); 
    return () => clearInterval(interval);
  }, []);

  // Top 5 Species
  const topSpecies = species.slice(0, 5);
  const maxCount = species.length > 0 ? species[0].count : 1;
  const chartColors = ['bg-yellow-400', 'bg-purple-400', 'bg-red-400', 'bg-orange-400', 'bg-emerald-400'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ข้อมูลไม้ยืนต้นภายในสถาบันฯ</h2>
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
            <span>อัปเดตล่าสุด: {lastUpdated}</span>
            {loading && <span className="text-emerald-500 animate-pulse">(กำลังโหลด...)</span>}
          </div>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="จำนวนที่ตรวจนับได้" 
          value={data.totalCount} 
          unit="ต้น"
          subtext="เป้าหมายทั้งหมด 3,940 ต้น"
          icon={Map}
          colorClass="bg-blue-500 text-blue-500"
          loading={loading}
        />
        <StatCard 
          title="เก็บข้อมูลครบถ้วน" 
          value={data.measured} 
          unit="ต้น"
          subtext="วัดความสูง, เรือนยอด, DBH แล้ว"
          icon={Trees}
          colorClass="bg-emerald-500 text-emerald-500"
          loading={loading}
        />
        <StatCard 
          title="กักเก็บคาร์บอนรวม" 
          value={data.totalCO2eTon} 
          unit="ตัน CO₂e"
          subtext={`เฉลี่ย ${data.avgPerTreeKg} กก./ต้น`}
          icon={Wind}
          colorClass="bg-teal-500 text-teal-500"
          loading={loading}
        />
        <StatCard 
          title="DBH เฉลี่ย" 
          value={data.avgDBHcm} 
          unit="ซม."
          subtext="ขนาดลำต้นเฉลี่ยในพื้นที่"
          icon={Activity}
          colorClass="bg-orange-500 text-orange-500"
          loading={loading}
        />
      </div>

      {/* Top Species Info Box (จาก H3) */}
      {(data.topSpeciesName || data.topSpeciesCount != null) && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-200 rounded-lg text-emerald-800"><Sprout size={20}/></div>
             <div>
                <p className="text-xs text-emerald-600 font-bold uppercase">พันธุ์ไม้ที่พบมากที่สุด</p>
                <p className="text-lg font-bold text-gray-800">{data.topSpeciesName || '-'}</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-2xl font-bold text-emerald-600">{data.topSpeciesCount != null ? data.topSpeciesCount.toLocaleString() : '-'}</p>
             <p className="text-xs text-emerald-500">ต้น</p>
          </div>
        </div>
      )}

      {/* Charts & Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart: Species Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <PieChart size={20} className="text-emerald-500"/> 
                สถิติพันธุ์ไม้ (5 อันดับแรก)
              </h3>
              <p className="text-xs text-gray-400">ดึงข้อมูลจาก Summary!H8:I</p>
            </div>
          </div>
          
          <div className="space-y-5">
            {loading ? (
               [1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-100 rounded-full w-full animate-pulse"></div>)
            ) : topSpecies.length > 0 ? (
              topSpecies.map((tree, i) => (
               <div key={i} className="group">
                  <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-md ${chartColors[i % 5]}`}></span>
                        <span className="font-medium text-gray-700">{i+1}. {tree.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{tree.count} ต้น</span>
                  </div>
                  <div className="w-full bg-gray-50 rounded-full h-3 overflow-hidden">
                      <div 
                          className={`h-3 rounded-full ${chartColors[i % 5]} transition-all duration-1000 ease-out group-hover:opacity-80`} 
                          style={{ width: `${(tree.count / maxCount) * 100}%` }}
                      ></div>
                  </div>
              </div>
            ))
            ) : (
              <p className="text-center text-gray-400 py-10">{error ? 'โหลดข้อมูลไม่สำเร็จ' : 'ไม่พบข้อมูลพันธุ์ไม้'}</p>
            )}
          </div>
        </div>

        {/* Detailed List Table */}
        <div className="bg-white p-0 rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
             <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Layers size={20} className="text-blue-500"/>
                รายละเอียด
             </h3>
             <p className="text-xs text-gray-400">รายการพันธุ์ไม้ทั้งหมด</p>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
             <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-white shadow-sm z-10">
                 <tr className="text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-semibold border-b border-gray-100">ชื่อพันธุ์ไม้</th>
                   <th className="p-4 font-semibold border-b border-gray-100 text-right">จำนวน</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 text-sm">
                 {loading ? (
                    <tr><td colSpan="2" className="p-4 text-center text-gray-400">กำลังโหลด...</td></tr>
                 ) : species.map((row, i) => (
                   <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                     <td className="p-3 px-4 font-medium text-gray-700 border-l-4 border-transparent hover:border-emerald-400">
                        {row.name}
                     </td>
                     <td className="p-3 px-4 text-right text-gray-600 font-mono">
                        {row.count.toLocaleString()}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- APP SHELL ---

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Prompt', sans-serif; }
      `}</style>

      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <div className="md:ml-64 min-h-screen flex flex-col transition-all duration-300">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 hidden md:block">CNMI Green Area Management</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-gray-700">Admin User</p>
               <p className="text-xs text-emerald-600">Assets & Environment</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shadow-sm border border-emerald-200">
              A
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {activeMenu === 'dashboard' ? <DashboardContent /> : (
             <div className="flex flex-col items-center justify-center h-[60vh] text-center text-gray-400">
              <Trees size={64} className="text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-600">หน้า {activeMenu}</h3>
              <p>ส่วนนี้ยังไม่เปิดใช้งาน (สามารถเพิ่ม Logic ได้ในภายหลัง)</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
