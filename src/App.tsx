import React, { useState, useEffect } from 'react';
import { 
  TreeDeciduous, 
  Map as MapIcon, 
  BarChart3, 
  Wind, 
  Droplets, 
  Leaf, 
  Search, 
  Menu, 
  Navigation,
  Info,
  Layers
} from 'lucide-react';

// ---------- Types ----------
type DashboardData = {
  totalCount: number | null; // A3
  measured: number | null; // B3
  totalCO2eTon: number | null; // C3
  avgDBHcm: number | null; // D3
  avgPerTreeKg: number | null; // E3
  topSpeciesName: string | null; // H3
  topSpeciesCount: number | null; // I3
};

type SpeciesRow = { name: string; count: number };

type TreeLocation = {
  id: string;
  species: string;
  locationId: string;
  locationName: string;
  health: string;
  height: number;
  carbon: number;
  lat: number;
  lng: number;
  status: 'Native' | 'Invasive' | 'Introduced';
};

// ---------- Configuration ----------
const SHEET_ID = "1JRPKppFO8s41gTIM26xZLojsaij-eQG2qo-mhwAg1qg";
const GID_SUMMARY = "1289823245";
const SPECIES_RANGE = "H8:I";

// ---------- Utilities ----------
function gvizUrl(gid: string, range: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&range=${encodeURIComponent(range)}`;
}

function parseGviz(text: string) {
  try {
    const json = JSON.parse(text.substring(47, text.length - 2));
    return json?.table;
  } catch (e) {
    console.error("Error parsing Gviz data", e);
    return null;
  }
}

const normalizeNumerals = (s: string) =>
  String(s)
    .replace(/๐/g, "0")
    .replace(/๑/g, "1")
    .replace(/๒/g, "2")
    .replace(/๓/g, "3")
    .replace(/๔/g, "4")
    .replace(/๕/g, "5")
    .replace(/๖/g, "6")
    .replace(/๗/g, "7")
    .replace(/๘/g, "8")
    .replace(/๙/g, "9");

function toNumber(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = normalizeNumerals(String(raw)).replace(/[^0-9.\-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// ---------- Constants & Mock Data ----------
// (ใช้ Mock สำหรับตำแหน่งบนแผนที่ เพราะข้อมูล Summary ไม่ได้ระบุพิกัดรายต้น)
const LOCATIONS = [
  { id: 'All', name: 'พื้นที่ทั้งหมด' },
  { id: 'LC', name: 'อาคารศูนย์การเรียนรู้' },
  { id: 'R2', name: 'ถนนเส้นกลาง (ประตู 1-ศูนย์อาหาร)' },
  { id: 'R4', name: 'ถนนหลัง รพ.' },
  { id: 'CB', name: 'พื้นที่คันคลอง' },
  { id: 'D5', name: 'หอพัก 5' }
];

const TREE_DATA_MOCK: TreeLocation[] = [
  { id: 'CNMI-LC-SESI-01', species: 'ขี้เหล็ก', locationId: 'LC', locationName: 'อาคารศูนย์การเรียนรู้', health: 'Good', height: 5.0, carbon: 89.40, lat: 13.5252527, lng: 100.7624733, status: 'Native' },
  { id: 'CNMI-LC-SESI-02', species: 'ขี้เหล็ก', locationId: 'LC', locationName: 'อาคารศูนย์การเรียนรู้', health: 'Good', height: 5.5, carbon: 112.26, lat: 13.5252487, lng: 100.7625309, status: 'Native' },
  { id: 'CNMI-LC-SESI-06', species: 'ขี้เหล็ก', locationId: 'LC', locationName: 'อาคารศูนย์การเรียนรู้', health: 'Excellent', height: 6.0, carbon: 144.31, lat: 13.5252365, lng: 100.7628175, status: 'Native' },
  { id: 'CNMI-R2-CAFI-01', species: 'ราชพฤกษ์', locationId: 'R2', locationName: 'ถนนเส้นกลาง', health: 'Good', height: 6.5, carbon: 75.84, lat: 13.5254986, lng: 100.7597019, status: 'Native' },
  { id: 'CNMI-R2-CAFI-02', species: 'ราชพฤกษ์', locationId: 'R2', locationName: 'ถนนเส้นกลาง', health: 'Good', height: 7.5, carbon: 127.80, lat: 13.5254982, lng: 100.7597625, status: 'Native' },
  { id: 'CNMI-R4-SEGR-01', species: 'แคแสด', locationId: 'R4', locationName: 'ถนนหลัง รพ.', health: 'Fair', height: 5.0, carbon: 35.5, lat: 13.5275334, lng: 100.7632204, status: 'Invasive' },
  { id: 'CNMI-D5-PTIN-01', species: 'ประดู่', locationId: 'D5', locationName: 'หอพัก 5', health: 'Good', height: 8.0, carbon: 120.5, lat: 13.5275619, lng: 100.7634712, status: 'Native' },
];

// ---------- Components ----------

interface StatCardProps {
  title: string;
  value: number | string | null;
  unit: string;
  icon: React.ElementType;
  trend?: string | null;
  color: string;
  subValue?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, icon: Icon, trend, color, subValue }) => (
  <div className="relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-xl group hover:bg-white/15 transition-all duration-300">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 ${color}`}>
      <Icon size={100} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 text-gray-300 mb-2">
        <Icon size={18} />
        <span className="text-sm font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-white">{value != null ? value.toLocaleString() : "—"}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      {subValue && (
        <div className="mt-1 text-xs text-gray-400">
          {subValue}
        </div>
      )}
      {trend && (
        <div className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1">
          <span>▲ {trend}</span>
          <span className="text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  </div>
);

const LocationFilter = ({ selected, onSelect }: { selected: string, onSelect: (id: string) => void }) => (
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {LOCATIONS.map((loc) => (
      <button
        key={loc.id}
        onClick={() => onSelect(loc.id)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap
          ${selected === loc.id 
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
      >
        {loc.name}
      </button>
    ))}
  </div>
);

const MapVisualization = ({ data }: { data: TreeLocation[] }) => {
  // Center map on CNMI: 13.525, 100.762 (Approximation)
  const mapUrl = "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d4500!2d100.7618!3d13.5255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sth";

  return (
    <div className="relative w-full h-[400px] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      <iframe 
        src={mapUrl}
        width="100%" 
        height="100%" 
        style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) contrast(90%) grayscale(20%)' }} 
        allowFullScreen={false} 
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0"
        title="CNMI Map"
      ></iframe>
      
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-slate-900/30 pointer-events-none"></div>

      <div className="absolute inset-0 pointer-events-none">
        {data.map((tree, i) => (
          <div
            key={tree.id}
            className={`absolute w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] cursor-pointer hover:scale-150 transition-transform duration-300 z-10 pointer-events-auto
              ${tree.status === 'Invasive' ? 'bg-orange-500' : 'bg-emerald-500'}`}
            style={{ 
              // Mock positioning logic for demo purposes
              left: `${50 + (tree.lng - 100.7618) * 4000}%`, 
              top: `${50 - (tree.lat - 13.5255) * 4000}%`,
              animation: `float ${3 + i % 2}s ease-in-out infinite`
            }}
            title={`${tree.species} (${tree.locationName})`}
          >
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        <button className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"><Navigation size={16} /></button>
        <button className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"><Layers size={16} /></button>
      </div>
      
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur p-2 rounded-lg border border-white/10 z-20">
        <h3 className="text-white text-sm font-semibold flex items-center gap-2">
          <MapIcon size={14} className="text-emerald-400"/>
          CNMI Tree Distribution
        </h3>
        <div className="flex gap-3 mt-1 text-[10px] text-gray-300">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Native</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Invasive</span>
        </div>
      </div>
    </div>
  );
};

const SpeciesChart = ({ speciesData }: { speciesData: SpeciesRow[] }) => {
  const topFive = speciesData.slice(0, 5);
  const total = speciesData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <TreeDeciduous size={20} className="text-emerald-400" />
        Species Diversity (Top 5)
      </h3>
      <div className="space-y-4">
        {topFive.length === 0 ? (
          <p className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</p>
        ) : (
          topFive.map((s) => (
            <div key={s.name} className="group">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 group-hover:text-white transition-colors">{s.name}</span>
                <span className="text-gray-400">{s.count.toLocaleString()} trees ({total > 0 ? Math.round((s.count/total)*100) : 0}%)</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${total > 0 ? (s.count/total)*100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const RecentActivity = () => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
      <Info size={20} className="text-blue-400" />
      System Status
    </h3>
    <div className="space-y-6">
      {[
        { txt: "Syncing with Google Sheets Database", time: "Just now", u: "System" },
        { txt: "Calculating CO2 Sequestration", time: "1 min ago", u: "AI Engine" },
        { txt: "Updated Tree Health Status", time: "10 mins ago", u: "Admin" }
      ].map((item, i) => (
        <div key={i} className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Leaf size={14} />
          </div>
          <div>
            <p className="text-gray-300 text-sm">{item.txt}</p>
            <div className="flex gap-2 items-center mt-1">
              <span className="text-xs text-gray-500">{item.time}</span>
              <span className="text-xs text-emerald-500/50">• {item.u}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ---------- Main App Component ----------

export default function App() {
  const [selectedLoc, setSelectedLoc] = useState('All');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Real Data State from Google Sheets
  const [realData, setRealData] = useState<DashboardData>({
    totalCount: null,
    measured: null,
    totalCO2eTon: null,
    avgDBHcm: null,
    avgPerTreeKg: null,
    topSpeciesName: null,
    topSpeciesCount: null,
  });
  const [speciesList, setSpeciesList] = useState<SpeciesRow[]>([]);

  // Fetch Data from Google Sheets
  useEffect(() => {
    (async () => {
      try {
        // 1. Fetch KPIs (A3:Z3)
        const rowUrl = gvizUrl(GID_SUMMARY, "A3:Z3");
        const rowTxt = await fetch(rowUrl).then((r) => r.text());
        const rowTable = parseGviz(rowTxt);
        const row = rowTable?.rows?.[0];

        if (row) {
          const getCell = (i: number) => row.c?.[i]?.v ?? row.c?.[i]?.f ?? null;
          setRealData({
            totalCount: toNumber(getCell(0)), // A3
            measured: toNumber(getCell(1)),   // B3
            totalCO2eTon: toNumber(getCell(2)), // C3
            avgDBHcm: toNumber(getCell(3)),    // D3
            avgPerTreeKg: toNumber(getCell(4)), // E3
            topSpeciesName: (getCell(7) as string | null), // H3
            topSpeciesCount: toNumber(getCell(8)) // I3
          });
        }

        // 2. Fetch Species List (H8:I)
        const spUrl = gvizUrl(GID_SUMMARY, SPECIES_RANGE);
        const spTxt = await fetch(spUrl).then((r) => r.text());
        const spTable = parseGviz(spTxt);
        const rows = (spTable?.rows ?? [])
          .map((r: any) => {
            const nameRaw = r?.c?.[0]?.v ?? r?.c?.[0]?.f ?? "";
            const cntRaw = r?.c?.[1]?.v ?? r?.c?.[1]?.f ?? null;
            const name = String(nameRaw).trim();
            const count = toNumber(cntRaw);
            return name && count != null ? { name, count } : null;
          })
          .filter(Boolean) as SpeciesRow[];
        
        rows.sort((a, b) => b.count - a.count);
        setSpeciesList(rows);
        setLoading(false);
      } catch (e) {
        console.error("Fetch error:", e);
        // Still set loading to false to show UI (with null data)
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
        <div className="z-10 flex flex-col items-center">
          <TreeDeciduous size={64} className="text-emerald-500 animate-bounce mb-4" />
          <h1 className="text-2xl font-bold tracking-widest uppercase">CNMI Smart Garden</h1>
          <p className="text-emerald-500/80 text-sm mt-2 animate-pulse">Syncing with Google Sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="flex h-screen relative z-10">
        
        {/* Sidebar (Desktop) */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 lg:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TreeDeciduous className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-white leading-tight">CNMI</h1>
                <p className="text-xs text-emerald-400 font-medium tracking-wider">SMART GARDEN</p>
              </div>
            </div>

            <nav className="space-y-2">
              {[
                { name: 'Overview', icon: BarChart3, active: true },
                { name: 'Digital Twin', icon: MapIcon },
                { name: 'Carbon Credit', icon: Leaf },
                { name: 'Reports', icon: Layers },
              ].map((item) => (
                <button
                  key={item.name}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${item.active 
                      ? 'bg-gradient-to-r from-emerald-500/20 to-transparent text-emerald-400 border-l-2 border-emerald-500' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <item.icon size={20} className={item.active ? 'text-emerald-400' : 'group-hover:text-white'} />
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="absolute bottom-0 w-full p-6 border-t border-white/5">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wind size={16} className="text-emerald-400"/>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Air Quality (Bang Phli)</p>
                  <p className="text-sm font-bold text-white">Moderate (56 AQI)</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for Mobile Sidebar */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg"
              >
                <Menu size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Chakri Naruebodindra Medical Institute</h2>
                <p className="text-sm text-gray-400 hidden sm:block">Real-time tree inventory & carbon monitoring</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center bg-slate-900 border border-white/10 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="ค้นหาพันธุ์ไม้..." 
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-48"
                />
              </div>
              <button className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors">
                <span className="font-bold">JS</span>
              </button>
            </div>
          </header>

          <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
            
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-medium text-gray-300">Filter by Zone</h3>
              <LocationFilter selected={selectedLoc} onSelect={setSelectedLoc} />
            </div>

            {/* Stats Grid - Using Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard 
                title="Total Trees Surveyed" 
                value={realData.totalCount} 
                unit="trees"
                icon={TreeDeciduous}
                trend={null}
                color="text-emerald-500"
                subValue={`Measured: ${realData.measured || 0}`}
              />
              <StatCard 
                title="Total Carbon (CO2e)" 
                value={realData.totalCO2eTon} 
                unit="tons"
                icon={Wind}
                trend="12%"
                color="text-blue-500"
              />
              <StatCard 
                title="Avg. DBH" 
                value={realData.avgDBHcm} 
                unit="cm"
                icon={Droplets}
                color="text-cyan-400"
              />
              <StatCard 
                title="Avg. Carbon/Tree" 
                value={realData.avgPerTreeKg} 
                unit="kg"
                icon={Leaf}
                color="text-lime-400"
              />
            </div>

            {/* Main Viz Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <MapVisualization data={TREE_DATA_MOCK} />
                
                {/* Detailed Table (Species Top List from Sheet) */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Top Species Inventory</h3>
                    <button className="text-sm text-emerald-400 hover:text-emerald-300">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="bg-white/5 text-gray-200 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-4">Rank</th>
                          <th className="px-6 py-4">Species Name</th>
                          <th className="px-6 py-4 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {speciesList.slice(0, 5).map((s, i) => (
                          <tr key={s.name} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">{i + 1}</td>
                            <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                            <td className="px-6 py-4 text-right font-bold text-emerald-400">{s.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SpeciesChart speciesData={speciesList} />
                <RecentActivity />
                
                {/* Promo / Action Card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                  <h3 className="text-xl font-bold mb-2 relative z-10">Add Survey Data</h3>
                  <p className="text-emerald-100 mb-4 text-sm relative z-10">Use your mobile device to scan tree QR codes or add new data manually.</p>
                  <button className="w-full py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors relative z-10">
                    + New Entry
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
    </svg>
  );
}
