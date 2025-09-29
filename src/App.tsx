import React, { useEffect, useMemo, useState } from "react";

// ---------- Types ----------
type Dashboard = {
  totalCount: number | null; // A3
  measured: number | null; // B3
  totalCO2eTon: number | null; // C3
  avgDBHcm: number | null; // D3
  avgPerTreeKg: number | null; // E3
  topSpeciesName: string | null; // H3
  topSpeciesCount: number | null; // I3
};

type SpeciesRow = { name: string; count: number };

// ---------- Config ----------
const SHEET_ID = "1JRPKppFO8s41gTIM26xZLojsaij-eQG2qo-mhwAg1qg";
const GID_SUMMARY = "1289823245";
const SPECIES_RANGE = "H8:I";

// ---------- Utilities ----------
function gvizUrl(gid: string, range: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&range=${encodeURIComponent(
    range
  )}`;
}

function parseGviz(text: string) {
  const json = JSON.parse(text.substring(47, text.length - 2));
  return json?.table;
}

const normalizeNumerals = (s: string) =>
  s
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

// ---------- App ----------
export default function App() {
  const [data, setData] = useState<Dashboard>({
    totalCount: null,
    measured: null,
    totalCO2eTon: null,
    avgDBHcm: null,
    avgPerTreeKg: null,
    topSpeciesName: null,
    topSpeciesCount: null,
  });
  const [species, setSpecies] = useState<SpeciesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // KPIs (A3:E3 + H3/I3)
        const rowUrl = gvizUrl(GID_SUMMARY, "A3:Z3");
        const rowTxt = await fetch(rowUrl).then((r) => r.text());
        const rowTable = parseGviz(rowTxt);
        const row = rowTable?.rows?.[0];
        if (!row) throw new Error("No row 3 returned");

        const getCell = (i: number) => row.c?.[i]?.v ?? row.c?.[i]?.f ?? null;

        const A3 = toNumber(getCell(0));
        const B3 = toNumber(getCell(1));
        const C3 = toNumber(getCell(2));
        const D3 = toNumber(getCell(3));
        const E3 = toNumber(getCell(4));
        const H3name = (getCell(7) ?? null) as string | null;
        const I3count = toNumber(getCell(8));

        // Species table (H8:I)
        const spUrl = gvizUrl(GID_SUMMARY, SPECIES_RANGE);
        const spTxt = await fetch(spUrl).then((r) => r.text());
        const spTable = parseGviz(spTxt);
        const rows: SpeciesRow[] = (spTable?.rows ?? [])
          .map((r: any) => {
            const nameRaw = r?.c?.[0]?.v ?? r?.c?.[0]?.f ?? "";
            const cntRaw = r?.c?.[1]?.v ?? r?.c?.[1]?.f ?? null;
            const name = String(nameRaw).trim();
            const count = toNumber(cntRaw);
            return name && count != null ? { name, count } : null;
          })
          .filter(Boolean) as SpeciesRow[];

        rows.sort((a, b) => b.count - a.count);

        setData({
          totalCount: A3,
          measured: B3,
          totalCO2eTon: C3,
          avgDBHcm: D3,
          avgPerTreeKg: E3,
          topSpeciesName: H3name,
          topSpeciesCount: I3count,
        });
        setSpecies(rows);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(
          "โหลดข้อมูลไม่สำเร็จ (ตรวจสิทธิ์/ช่วงเซลล์/โครงสร้างตาราง/รูปแบบตัวเลข)"
        );
        setLoading(false);
      }
    })();
  }, []);

  const topFive = useMemo(() => species.slice(0, 8), [species]);

  if (loading) return <FullCenter>Loading data…</FullCenter>;
  if (error)
    return <FullCenter style={{ color: "crimson" }}>{error}</FullCenter>;

  const {
    totalCount,
    measured,
    totalCO2eTon,
    avgDBHcm,
    avgPerTreeKg,
    topSpeciesName,
    topSpeciesCount,
  } = data;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: "22px 28px", // เพิ่ม padding ให้นุ่มขึ้น
            background: "var(--card)",
            boxShadow: "var(--shadow)",
          }}
        >
          <img
            src="/CNMI_logo.png"
            alt="CNMI Logo"
            style={{ height: 80, width: 160, objectFit: "contain" }}
          />
          <div>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "var(--green)",
                margin: 0,
              }}
            >
              รายงานข้อมูลปริมาณต้นไม้
            </h1>
            <p
              style={{ fontSize: 15, color: "var(--muted)", margin: "6px 0 0" }}
            >
              งานกายภาพและสิ่งแวดล้อม ฝ่ายบริหารสินทรัพย์ อาคารสถานที่
              สถาบันการแพทย์จักรีนฤบดินทร์
            </p>
          </div>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-block",
              textAlign: "center",
              whiteSpace: "pre-line",
              lineHeight: 1.4,
              padding: "6px 12px",
              borderRadius: "12px",
              background: "#f0fdf4",
              color: "#166534",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #bbf7d0",
            }}
          >
            {`Live from Google Sheets\n${new Date().toLocaleDateString(
              "th-TH",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}`}
          </span>
        </header>

        {/* KPI Cards */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 20,
            marginTop: 24,
          }}
        >
          <Card title="จำนวนที่ตรวจนับได้" value={totalCount} suffix="ต้น" />
          <Card
            title={"เก็บข้อมูลครบถ้วน\n(ความสูง, เรือนยอด, DBH)"}
            value={measured}
            suffix="ต้น"
          />
          <Card
            title="กักเก็บคาร์บอนรวม"
            value={totalCO2eTon}
            suffix="ตัน CO₂e"
          />
          <Card title="DBH เฉลี่ย" value={avgDBHcm} suffix="ซม." />
          <Card
            title="คาร์บอนเฉลี่ย/ต้น"
            value={avgPerTreeKg}
            suffix="กก. CO₂e"
          />
        </section>

        {/* Top species info */}
        {(topSpeciesName || topSpeciesCount != null) && (
          <section style={{ marginTop: 28 }}>
            <h3
              style={{ fontSize: 18, color: "var(--ink)", margin: "0 0 12px" }}
            >
              ชนิดที่พบมากสุด (ตอนนี้)
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: 12,
                alignItems: "center",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                background: "var(--card)",
                padding: 20,
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: "#065f46" }}>
                {topSpeciesName ?? "—"}
              </div>
              <div
                style={{
                  justifySelf: "end",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                {topSpeciesCount != null
                  ? `${topSpeciesCount.toLocaleString()} ต้น`
                  : "—"}
              </div>
            </div>
          </section>
        )}

        {/* Species */}
        <section
          style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 24,
          }}
        >
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--card)",
              padding: 20,
              boxShadow: "var(--shadow)",
            }}
          >
            <SectionTitle>ชนิดของพันธุ์ไม้ใน CNMI</SectionTitle>
            {topFive.length === 0 ? (
              <p style={{ color: "#64748b" }}>
                ไม่พบข้อมูลในช่วง {SPECIES_RANGE} (คอลัมน์ H=ชนิด, I=จำนวน)
              </p>
            ) : (
              <BarChart data={topFive} height={320} />
            )}
          </div>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              background: "var(--card)",
              padding: 20,
              boxShadow: "var(--shadow)",
            }}
          >
            <SectionTitle>ชนิดของพันธุ์ไม้ใน CNMI</SectionTitle>
            <ol
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 10,
              }}
            >
              {topFive.map((s, i) => (
                <li
                  key={s.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {i + 1}. {s.name}
                  </span>
                  <span style={{ color: "#334155" }}>
                    {s.count.toLocaleString()} ต้น
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 12,
            margin: "32px 0 8px",
          }}
        >
          อัปเดตแบบอ่านอย่างเดียวจาก Google Sheets (gviz) —
          ปรับช่วงข้อมูลได้ในโค้ด
        </footer>
      </div>
    </div>
  );
}

// ---------- UI ----------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 6,
          height: 18,
          borderRadius: 9999,
          background: "var(--green-2)",
        }}
      />
      <h3 style={{ margin: 0, fontSize: 18, color: "var(--ink)" }}>
        {children}
      </h3>
    </div>
  );
}

function Card({
  title,
  value,
  suffix,
}: {
  title: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div
      style={{
        padding: "20px 16px",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 150,
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#0f3b6d",
          marginBottom: 10,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: "60%",
          height: 1,
          background: "var(--line)",
          margin: "6px 0 12px",
        }}
      />
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1.2,
          color: "#065f46",
        }}
      >
        {value != null ? value.toLocaleString() : "—"}
      </div>
      {suffix && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginTop: 4,
            color: "#334155",
          }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}

function FullCenter({
  children,
  style = {} as React.CSSProperties,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        ...style,
      }}
    >
      <div style={{ fontSize: 18 }}>{children}</div>
    </div>
  );
}

// ---------- Mini Bar Chart ----------
function BarChart({
  data,
  height = 300,
}: {
  data: SpeciesRow[];
  height?: number;
}) {
  const padding = { top: 24, right: 24, bottom: 40, left: 120 };
  const width = 720;
  const max = Math.max(1, ...data.map((d) => d.count));
  const barGap = 10;
  const barH = Math.max(
    18,
    Math.min(
      36,
      (height - padding.top - padding.bottom - barGap * (data.length - 1)) /
        data.length
    )
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <text x={padding.left} y={18} fontSize={12} fill="#64748b">
        จำนวน (ต้น)
      </text>
      {data.map((d, i) => {
        const y = padding.top + i * (barH + barGap);
        const w = ((width - padding.left - padding.right) * d.count) / max;
        return (
          <g key={d.name} transform={`translate(0, ${y})`}>
            <text
              x={padding.left - 8}
              y={barH / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={13}
              fill="var(--ink)"
            >
              {d.name}
            </text>
            <rect
              x={padding.left}
              y={0}
              width={w}
              height={barH}
              rx={8}
              ry={8}
              fill="var(--green-2)"
              opacity={0.9}
            />
            <text
              x={padding.left + w + 6}
              y={barH / 2}
              dominantBaseline="middle"
              fontSize={12}
              fill="#334155"
            >
              {d.count.toLocaleString()}
            </text>
          </g>
        );
      })}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="var(--line)"
      />
    </svg>
  );
}
