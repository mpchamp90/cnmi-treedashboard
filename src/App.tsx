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
  Layers,
  Activity,
  AlertCircle
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
    // Remove "/*O_o*/" and "google.visualization.Query.setResponse(" wrapper
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}") + 1;
    if (start === -1 || end === -1) return null;
    
    const jsonString = text.substring(start, end);
    const json = JSON.parse(jsonString);
    return json?.table;
  } catch (e) {
    console.error("Error parsing Gviz data", e);
    return null;
  }
}

const normalizeNumerals = (s: any) =>
  String(s || "")
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

function toNumber(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = normalizeNumerals(raw).replace(/[^0-9.\-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

// ---------- Constants & Mock Data ----------
const LOCATIONS = [
  { id: 'All', name: 'พื้นที่ทั้งหมด' },
  { id: 'LC', name: 'ศูนย์การเรียนรู้' },
  { id: 'R2', name: 'ถนนเส้นกลาง' },
  { id: 'R4', name: 'ถนนหลัง รพ.' },
  { id: 'CB', name: 'คันคลอง' },
  { id: 'D5', name: 'หอพัก 5' }
];

// Mock data for map visual (since summary sheet doesn't have coordinates)
const TREE_DATA_MOCK: TreeLocation[] = [
  { id: 'M-01', species: 'ขี้เหล็ก', locationId: 'LC', locationName: 'LC', health: 'Good', height: 5, carbon: 89, lat: 13.52525, lng: 100.76247, status: 'Native' },
  { id: 'M-02', species: 'ขี้เหล็ก', locationId: 'LC', locationName: 'LC', health: 'Excellent', height: 6, carbon: 144, lat: 13.52523, lng: 100.76281, status: 'Native' },
  { id: 'M-03', species: 'ราชพฤกษ์', locationId: 'R2', locationName: 'R2', health: 'Good', height: 6.5, carbon: 75, lat: 13.52549, lng: 100.75970, status: 'Native' },
  { id: 'M-04', species: 'ราชพฤกษ์', locationId: 'R2', locationName: 'R2', health: 'Good', height: 7.5, carbon: 127, lat: 13.52549, lng: 100.75976, status: 'Native' },
  { id: 'M-05', species: 'แคแสด', locationId: 'R4', locationName: 'R4', health: 'Fair', height: 5, carbon: 35, lat: 13.52753, lng: 100.76322, status: 'Invasive' },
  { id: 'M-06', species: 'ประดู่', locationId: 'D5', locationName: 'D5', health: 'Good', height: 8, carbon: 120, lat: 13.52756, lng: 100.76347, status: 'Native' },
];

// ---------- Components ----------

const StatCard = ({ title, value, unit, icon: Icon, color, subValue }: { title: string, value: string | number, unit: string, icon: any, color: string, subValue?: string }) => (
  <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-lg hover:shadow-emerald-900/20 transition-all duration-300 group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500 ${color}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon size={18} className={color.replace('text-', 'text-opacity-80 ')} />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      {subValue && (
        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-slate-400">
          {subValue}
        </div>
      )}
    </div>
  </div>
);

const MapVisualization = ({ data }: { data: TreeLocation[] }) => {
  return (
    <div className="relative w-full h-[400px] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Google Maps Satellite View */}
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d4500!2d100.7618!3d13.5255!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sth"
        width="100%" 
        height="100%" 
        style={{ border: 0, filter: 'grayscale(30%) contrast(1.1) brightness(0.8)' }} 
        allowFullScreen
        loading="lazy" 
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0"
        title="CNMI Map"
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none" />

      {/* Map Points (Mock Visuals) */}
      <div className="absolute inset-0 pointer-events-none">
        {data.map((tree, i) => (
          <div
            key={tree.id}
            className={`absolute w-3 h-3 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] cursor-pointer hover:scale-150 transition-transform duration-300 z-10 pointer-events-auto
              ${tree.status === 'Invasive' ? 'bg-orange-500' : 'bg-emerald-400'}`}
            style={{ 
              left: `${50 + (tree.lng - 100.7618) * 4000}%`, 
              top: `${50 - (tree.lat - 13.5255) * 4000}%`,
              animation: `float ${3 + i % 2}s ease-in-out infinite`
            }}
            title={`${tree.species} (${tree.locationName})`}
          />
        ))}
      </div>

      {/* Map UI Elements */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 z-20">
        <h3 className="text-white text-xs font-bold flex items-center gap-2">
          <MapIcon size={12} className="text-emerald-400"/> CNMI Digital Twin
        </h3>
      </div>
    </div>
  );
};

// ---------- Main Application ----------

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedLoc, setSelectedLoc] = useState('All');
  
  // Data States
  const [realData, setRealData] = useState<DashboardData>({
    totalCount: null, measured: null, totalCO2eTon: null, 
    avgDBHcm: null, avgPerTreeKg: null, topSpeciesName: null, topSpeciesCount: null
  });
  const [speciesList, setSpeciesList] = useState<SpeciesRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch KPIs (A3:Z3)
        const rowUrl = gvizUrl(GID_SUMMARY, "A3:Z3");
        const rowRes = await fetch(rowUrl);
        if (!rowRes.ok) throw new Error("Failed to fetch Summary Data");
        const rowTxt = await rowRes.text();
        const rowTable = parseGviz(rowTxt);
        
        if (rowTable && rowTable.rows && rowTable.rows.length > 0) {
          const row = rowTable.rows[0];
          const getCell = (i: number) => row.c?.[i]?.v ?? row.c?.[i]?.f ?? null;
          
          setRealData({
            totalCount: toNumber(getCell(0)), // A3
            measured: toNumber(getCell(1)),   // B3
            totalCO2eTon: toNumber(getCell(2)), // C3
            avgDBHcm: toNumber(getCell(3)),    // D3
            avgPerTreeKg: toNumber(getCell(4)), // E3
            topSpeciesName: String(getCell(7) || ""), // H3
            topSpeciesCount: toNumber(getCell(8)) // I3
          });
        }

        // Fetch Species (H8:I)
        const spUrl = gvizUrl(GID_SUMMARY, SPECIES_RANGE);
        const spRes = await fetch(spUrl);
        const spTxt = await spRes.text();
        const spTable = parseGviz(spTxt);
        
        const rows = (spTable?.rows || [])
          .map((r: any) => {
            const name = String(r?.c?.[0]?.v || "").trim();
            const count = toNumber(r?.c?.[1]?.v);
            return name && count !== null ? { name, count } : null;
          })
          .filter((x): x is SpeciesRow => x !== null)
          .sort((a, b) => b.count - a.count);
          
        setSpeciesList(rows);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถเชื่อมต่อ Google Sheets ได้ในขณะนี้");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <TreeDeciduous size={48} className="text-emerald-500 animate-bounce mb-4" />
        <p className="text-emerald-500/80 text-sm animate-pulse">Syncing with CNMI Database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-white/10 rounded hover:bg-white/20">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="flex h-screen relative z-10">
        
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex-col">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TreeDeciduous className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight leading-tight">CNMI</h1>
                <p className="text-[10px] text-emerald-400 font-bold tracking-widest">SMART GARDEN</p>
              </div>
            </div>

            <nav className="space-y-1">
              {['Overview', 'Map View', 'Species', 'Reports'].map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveTab(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
                    ${activeTab === item 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                >
                  {item === 'Overview' && <BarChart3 size={18} />}
                  {item === 'Map View' && <MapIcon size={18} />}
                  {item === 'Species' && <Leaf size={18} />}
                  {item === 'Reports' && <Layers size={18} />}
                  <span>{item}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="mt-auto p-6 border-t border-white/5">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Wind size={16} /></div>
                <div>
                  <p className="text-xs text-slate-400">Air Quality</p>
                  <p className="text-sm font-bold text-white">Good (42)</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-slate-400 hover:text-white"><Menu size={20} /></button>
              <div>
                <h2 className="text-lg font-bold text-white">Dashboard Overview</h2>
                <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleDateString('th-TH')}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center bg-slate-900/80 border border-white/10 rounded-full px-4 py-2 w-64">
              <Search size={14} className="text-slate-500 mr-2" />
              <input type="text" placeholder="Search data..." className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 w-full" />
            </div>
          </header>

          <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Filters */}
            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLoc(loc.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border
                    ${selectedLoc === loc.id 
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                    }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Surveyed" 
                value={realData.totalCount?.toLocaleString() || "-"} 
                unit="Trees"
                icon={TreeDeciduous}
                color="text-emerald-500"
                subValue={`Measured: ${realData.measured || 0}`}
              />
              <StatCard 
                title="Carbon Stock" 
                value={realData.totalCO2eTon?.toLocaleString() || "-"} 
                unit="Tons CO2e"
                icon={Wind}
                color="text-blue-500"
              />
              <StatCard 
                title="Avg. DBH" 
                value={realData.avgDBHcm?.toLocaleString() || "-"} 
                unit="cm"
                icon={Activity}
                color="text-amber-500"
              />
              <StatCard 
                title="Avg. Carbon" 
                value={realData.avgPerTreeKg?.toLocaleString() || "-"} 
                unit="kg/Tree"
                icon={Leaf}
                color="text-teal-400"
              />
            </div>

            {/* Main Viz Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Map & Table */}
              <div className="lg:col-span-2 space-y-6">
                <MapVisualization data={TREE_DATA_MOCK} />
                
                {/* Top Species Table */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">Top Species Inventory</h3>
                    <span className="text-xs text-emerald-400 cursor-pointer hover:underline">View Full List</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-black/20">
                        <tr>
                          <th className="px-6 py-3">Rank</th>
                          <th className="px-6 py-3">Species</th>
                          <th className="px-6 py-3 text-right">Count</th>
                          <th className="px-6 py-3 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {speciesList.slice(0, 5).map((s, i) => (
                          <tr key={s.name} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-3 text-slate-500 font-mono">#{i + 1}</td>
                            <td className="px-6 py-3 font-medium text-white">{s.name}</td>
                            <td className="px-6 py-3 text-right text-emerald-400 font-bold">{s.count}</td>
                            <td className="px-6 py-3 text-right text-slate-400">
                              {realData.totalCount ? Math.round((s.count / realData.totalCount) * 100) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Charts & Activity */}
              <div className="space-y-6">
                {/* Species Distribution Chart */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                  <h3 className="font-bold text-white text-sm mb-6 flex items-center gap-2">
                    <Leaf size={16} className="text-emerald-500" /> Species Distribution
                  </h3>
                  <div className="space-y-4">
                    {speciesList.slice(0, 6).map((s) => (
                      <div key={s.name} className="group">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 group-hover:text-white transition-colors">{s.name}</span>
                          <span className="text-slate-500">{s.count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                            style={{ width: `${realData.totalCount ? (s.count / realData.totalCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-emerald-900/50 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white mb-2">New Survey?</h3>
                    <p className="text-slate-400 text-xs mb-4">Record new tree data or update existing entries via mobile.</p>
                    <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/20">
                      + Add Entry
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
          }
  );
}
