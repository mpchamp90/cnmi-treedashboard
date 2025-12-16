import React, { useState } from 'react';
import './App.css'; 

function App() {
  // สร้างตัวแปร State จำลองไว้เล่นๆ (ในอนาคตเชื่อม Database ได้)
  const [activeMenu, setActiveMenu] = useState('dashboard');

  return (
    <div className="app-container">
      {/* --- Sidebar เมนูซ้าย --- */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">🌳</div>
          <h1>CNMI Tree</h1>
        </div>
        
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            📊 แดชบอร์ด
          </button>
          <button 
            className={`nav-item ${activeMenu === 'map' ? 'active' : ''}`}
            onClick={() => setActiveMenu('map')}
          >
            🗺️ แผนที่ต้นไม้
          </button>
          <button 
            className={`nav-item ${activeMenu === 'data' ? 'active' : ''}`}
            onClick={() => setActiveMenu('data')}
          >
            📋 ข้อมูลพรรณไม้
          </button>
        </nav>

        <div className="sidebar-footer">
          <p>Version 1.0.0</p>
        </div>
      </aside>

      {/* --- Main Content เนื้อหาขวา --- */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h2>ระบบจัดการพื้นที่สีเขียว</h2>
            <p className="subtitle">คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี (CNMI)</p>
          </div>
          <div className="user-profile">
            <span>Admin</span>
            <div className="avatar">A</div>
          </div>
        </header>

        {/* ส่วนแสดงผลข้อมูล (Cards) */}
        <div className="stats-grid">
          {/* Card 1 */}
          <div className="stat-card green-card">
            <div className="card-icon">🌲</div>
            <div>
              <h3>จำนวนต้นไม้</h3>
              <p className="number">1,250</p>
              <small>+12 ต้น เดือนนี้</small>
            </div>
          </div>

          {/* Card 2 */}
          <div className="stat-card blue-card">
            <div className="card-icon">☁️</div>
            <div>
              <h3>Carbon Credit</h3>
              <p className="number">850.5</p>
              <small>tCO2e (โดยประมาณ)</small>
            </div>
          </div>

          {/* Card 3 */}
          <div className="stat-card orange-card">
            <div className="card-icon">📍</div>
            <div>
              <h3>พื้นที่สีเขียว</h3>
              <p className="number">45.2</p>
              <small>ไร่ (Zone A, B, C)</small>
            </div>
          </div>
        </div>

        {/* ส่วนเนื้อหาหลัก (จำลองพื้นที่กราฟหรือตาราง) */}
        <div className="content-section">
          <div className="section-header">
            <h3>สถานะรายพื้นที่ (Mockup Data)</h3>
            <button className="btn-action">เพิ่มข้อมูล +</button>
          </div>
          
          {/* จำลองตารางสวยๆ */}
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>รหัสต้นไม้</th>
                  <th>ชื่อพันธุ์ไม้</th>
                  <th>ความสูง (ม.)</th>
                  <th>สถานะ</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>TR-001</td>
                  <td>สักทอง (Teak)</td>
                  <td>12.5</td>
                  <td><span className="badge healthy">สมบูรณ์</span></td>
                  <td><button className="btn-sm">ดูรายละเอียด</button></td>
                </tr>
                <tr>
                  <td>TR-002</td>
                  <td>ยางนา (Yang)</td>
                  <td>25.0</td>
                  <td><span className="badge warning">รอตัดแต่ง</span></td>
                  <td><button className="btn-sm">ดูรายละเอียด</button></td>
                </tr>
                <tr>
                  <td>TR-003</td>
                  <td>ประดู่ (Padauk)</td>
                  <td>8.4</td>
                  <td><span className="badge healthy">สมบูรณ์</span></td>
                  <td><button className="btn-sm">ดูรายละเอียด</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
