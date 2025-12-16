import React, { useEffect, useState } from "react";
import {
  Map,
  Sprout,
  Activity,
  Trees,
  Wind,
  Menu,
  Layers,
  AlertCircle,
} from "lucide-react";

/* ================= CONFIG ================= */
const SHEET_ID = "1JRPKppFO8s41gTIM26xZLojsaij-eQG2qo-mhwAg1qg";
const GID_SUMMARY = "1289823245";
const SPECIES_RANGE = "H8:I";

/* ================= TYPES ================= */
type MenuId = "dashboard" | "inventory" | "map" | "settings";

type SidebarProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeMenu: MenuId;
  setActiveMenu: (id: MenuId) => void;
};

type StatCardProps = {
  title: string;
  value: number | null;
  unit: string;
  subtext: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
  loading: boolean;
};

type DashboardData = {
  totalCount: number | null;
  measured: number | null;
  totalCO2eTon: number | null;
  avgDBHcm: number | null;
  avgPerTreeKg: number | null;
  topSpeciesName: string | null;
  topSpeciesCount: number | null;
};

type SpeciesRow = { name: string; count: number };

type GvizCell = { v?: unknown; f?: string } | null;
type GvizRow = { c?: GvizCell[] };
type GvizTable = { rows?: GvizRow[] };

/* ================= UTILITIES ================= */
function gvizUrl(gid: string, range: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&range=${encodeURIComponent(
    range
  )}`;
}

/**
 * GViz response จะมี prefix แปลก ๆ ก่อน JSON
 * วิธีที่ทนสุด: หา substring ก้อน JSON ตั้งแต่ { ... } ก้อนสุดท้าย
 */
function parseGviz(text: string): GvizTable | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const json = JSON.parse(text.slice(start, end + 1));
    return json?.table ?? null;
  } catch {
    return null;
  }
}

const normalizeNumerals = (s: unknown): string =>
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
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const cleaned = normalizeNumerals(raw).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/* ================= COMPONENTS ================= */
const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  activeMenu,
  setActiveMenu,
}) => {
  const menuItems: { id: MenuId; label: string; icon: React.ComponentType<any> }[] =
    [
      { id: "dashboard", label: "ภาพรวม", icon: Trees },
      { id: "inventory", label: "ข้อมูลรายชนิด", icon: Layers },
      { id: "map", label: "แผนที่", icon: Map },
      { id: "settings", label: "ตั้งค่า", icon: Activity },
    ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r z-30 transition-transform ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Sprout size={20} />
          </div>
          <div>
            <div className="font-bold leading-tight">CNMI Tree</div>
            <div className="text-xs text-gray-400">Live Inventory</div>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          {menuItems.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMenu(m.id)}
              className={`w-full flex gap-3 px-4 py-2 rounded-lg text-sm ${
                activeMenu === m.id
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <m.icon size={18} />
              {m.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtext,
  icon: Icon,
  colorClass,
  loading,
}) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={18} className={colorClass} />
      <div className="text-sm text-gray-500">{title}</div>
    </div>
    <div className="text-2xl font-bold text-gray-800">
      {loading ? "-" : value?.toLocaleString() ?? "-"}{" "}
      <span className="text-sm font-medium text-gray-400">{unit}</span>
    </div>
    <div className="text-xs text-gray-400 mt-1">{subtext}</div>
  </div>
);

/* ================= MAIN ================= */
const DashboardContent: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<DashboardData>({
    totalCount: null,
    measured: null,
    totalCO2eTon: null,
    avgDBHcm: null,
    avgPerTreeKg: null,
    topSpeciesName: null,
    topSpeciesCount: null,
  });

  const [species, setSpecies] = useState<SpeciesRow[]>([]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      // KPI row A3:Z3
      const rowTxt = await fetch(gvizUrl(GID_SUMMARY, "A3:Z3")).then((r) =>
        r.text()
      );
      const table = parseGviz(rowTxt);
      const row = table?.rows?.[0];
      if (!row) throw new Error("ไม่พบข้อมูลใน Summary!A3:Z3");

      const getCell = (i: number) => row.c?.[i]?.v ?? row.c?.[i]?.f ?? null;

      setData({
        totalCount: toNumber(getCell(0)),
        measured: toNumber(getCell(1)),
        totalCO2eTon: toNumber(getCell(2)),
        avgDBHcm: toNumber(getCell(3)),
        avgPerTreeKg: toNumber(getCell(4)),
        topSpeciesName:
          getCell(7) == null ? null : String(getCell(7)).trim() || null,
        topSpeciesCount: toNumber(getCell(8)),
      });

      // Species table H8:I
      const spTxt = await fetch(gvizUrl(GID_SUMMARY, SPECIES_RANGE)).then((r) =>
        r.text()
      );
      const spTable = parseGviz(spTxt);

      const rows: SpeciesRow[] = (spTable?.rows ?? [])
        .map((r: GvizRow) => {
          const name = String(r.c?.[0]?.v ?? r.c?.[0]?.f ?? "").trim();
          const count = toNumber(r.c?.[1]?.v ?? r.c?.[1]?.f);
          return name && count != null ? { name, count } : null;
        })
        .filter((x): x is SpeciesRow => x !== null)
        .sort((a, b) => b.count - a.count);

      setSpecies(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
        <AlertCircle size={18} />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-bold text-gray-800">Dashboard</div>
        <button
          onClick={fetchData}
          className="text-sm px-3 py-2 rounded-lg bg-white border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="จำนวนต้น"
          value={data.totalCount}
          unit="ต้น"
          subtext="จำนวนที่ตรวจนับได้"
          icon={Trees}
          colorClass="text-emerald-600"
          loading={loading}
        />
        <StatCard
          title="CO₂ รวม"
          value={data.totalCO2eTon}
          unit="ตัน"
          subtext="คาร์บอนสะสม"
          icon={Wind}
          colorClass="text-blue-600"
          loading={loading}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">
          พันธุ์ไม้ (Top 10)
        </div>
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-gray-500">
                <th className="text-left px-4 py-2">ชื่อ</th>
                <th className="text-right px-4 py-2">จำนวน</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(loading ? [] : species.slice(0, 10)).map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {r.count.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && species.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-400" colSpan={2}>
                    ไม่พบข้อมูลพันธุ์ไม้
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-400" colSpan={2}>
                    กำลังโหลด...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ================= APP ================= */
const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuId>("dashboard");
  const [open, setOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isOpen={open}
        toggleSidebar={() => setOpen(!open)}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="md:ml-64 p-6">
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border"
        >
          <Menu size={18} />
          เมนู
        </button>

        {activeMenu === "dashboard" ? (
          <DashboardContent />
        ) : (
          <div className="text-gray-400">หน้านี้ยังไม่ได้ทำ</div>
        )}
      </main>
    </div>
  );
};

export default App;
