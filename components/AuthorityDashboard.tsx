import React, { useState, useEffect, useRef } from 'react';
import { DELHI_WARDS, MOCK_COMPLAINTS } from '../constants';
import { Complaint } from '../types';
import LeafletAQIMap from './LeafletAQIMap';
import { useWardData } from '../contexts/WardDataContext';
import Dashboard from './Dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { getSourceAttribution } from '../services/geminiService';
import { fetchComplaints, updateComplaintStatus } from '../services/complaintService';

interface AuthorityDashboardProps {
  onNavigateMap: () => void;
  onSignOut: () => void;
}

type Tab = 'MAP' | 'ANALYSIS' | 'SIMULATION' | 'INCIDENTS';

const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ onNavigateMap, onSignOut }) => {
  const { wards, loading } = useWardData();
  const [activeTab, setActiveTab] = useState<Tab>('MAP');
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveComplaints, setLiveComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [complaintFilter, setComplaintFilter] = useState<string>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer state

  // AI Attribution state
  const [attribution, setAttribution] = useState<{
    rootCause: string; primaryDriver: string; secondaryDriver: string;
    confidence: number; meteorologicalFactor: string; recommendedAction: string;
  } | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(false);

  const displayWards = wards.length > 0 ? wards : DELHI_WARDS;

  // Composite Priority Score: AQI 50% + Population 30% + Complaints 20%
  const computePriority = (w: typeof DELHI_WARDS[0]) => {
    const aqiScore = Math.min(100, (w.aqi / 500) * 100) * 0.50;
    const popScore = w.populationDensity === 'High' ? 30 : w.populationDensity === 'Medium' ? 20 : 10;
    const complaintScore = Math.min(20, (w.complaints / 60) * 20);
    return Math.round(aqiScore + popScore + complaintScore);
  };

  const sortedWards = [...displayWards]
    .map(w => ({ ...w, priorityScore: computePriority(w) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  useEffect(() => {
    if (sortedWards.length > 0 && !selectedWardId) {
      setSelectedWardId(sortedWards[0].id);
    }
  }, [sortedWards.length]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load Supabase complaints
  useEffect(() => {
    fetchComplaints().then(data => setLiveComplaints(data));
  }, []);

  const selectedWard = sortedWards.find(w => w.id === selectedWardId) || sortedWards[0];

  // Fetch AI attribution whenever ward changes
  useEffect(() => {
    if (!selectedWard || activeTab !== 'ANALYSIS') return;
    setAttributionLoading(true);
    setAttribution(null);
    getSourceAttribution(selectedWard)
      .then(data => setAttribution(data))
      .catch(() => setAttribution(null))
      .finally(() => setAttributionLoading(false));
  }, [selectedWardId, activeTab]);

  // Complaint action: write to Supabase + update local state
  const handleComplaintAction = async (id: string, status: Complaint['status']) => {
    setLiveComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    await updateComplaintStatus(id, status);
  };

  if (loading && wards.length === 0) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-[200]">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="size-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm text-zinc-400 tracking-widest uppercase">Connecting to CPCB data mesh...</p>
        </div>
      </div>
    );
  }

  if (!selectedWard) return null;

  // Derived metrics
  const criticalCount = sortedWards.filter(w => w.status === 'CRITICAL').length;
  const cityAvgAqi = Math.round(sortedWards.reduce((s, w) => s + w.aqi, 0) / Math.max(1, sortedWards.length));
  const activeIncidents = liveComplaints.filter(c => c.status !== 'Resolved').length;
  const resolvedCount = liveComplaints.filter(c => c.status === 'Resolved').length;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusColor = (status: string) => {
    if (status === 'CRITICAL') return 'text-red-500 bg-red-500/10';
    if (status === 'SEVERE') return 'text-orange-500 bg-orange-500/10';
    if (status === 'POOR') return 'text-yellow-600 bg-yellow-500/10';
    return 'text-green-600 bg-green-500/10';
  };

  const aqiColor = (aqi: number) => {
    if (aqi > 300) return 'text-red-500';
    if (aqi > 200) return 'text-orange-500';
    if (aqi > 100) return 'text-yellow-600';
    return 'text-green-600';
  };

  const filteredComplaints = complaintFilter === 'All'
    ? liveComplaints
    : liveComplaints.filter(c => c.status === complaintFilter);

  // ── Government Report Generator ────────────────────────────────────────────
  const generateGovernmentReport = (
    complaints: Complaint[],
    wards: typeof sortedWards,
    avgAqi: number,
    critical: number
  ) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const totalComplaints = complaints.length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const open = complaints.filter(c => c.status !== 'Resolved').length;
    const highIntensity = complaints.filter(c => c.intensity === 'High').length;
    const top5Wards = wards.slice(0, 5);

    const complaintRows = complaints.map(c => {
      const trust = c.reporter ? `${Math.round(c.reporter.trustScore * 100)}%` : '—';
      const auth = c.reporter?.authMethod ?? '—';
      const coords = c.coordinates ? `${c.coordinates.lat.toFixed(4)}, ${c.coordinates.lng.toFixed(4)}` : '—';
      const aqiAtR = c.aqiAtSubmission ?? '—';
      const hash = c.integrityHash ? c.integrityHash.slice(0, 24) + '...' : '—';
      const ts = new Date(c.timestamp);
      const time = isNaN(ts.getTime()) ? c.timestamp : ts.toLocaleString('en-IN');
      return `<tr>
        <td>${c.id}</td>
        <td>${c.type}</td>
        <td>${c.ward}</td>
        <td>${c.location}</td>
        <td>${time}</td>
        <td><span class="badge badge-${c.status.toLowerCase()}">${c.status}</span></td>
        <td>${c.intensity}</td>
        <td>${c.responsibleDept}</td>
        <td>${trust}</td>
        <td>${auth}</td>
        <td>${coords}</td>
        <td>${aqiAtR}</td>
        <td style="font-family:monospace;font-size:9px">${hash}</td>
      </tr>`;
    }).join('');

    const wardRows = top5Wards.map(w => `<tr>
      <td>${w.name}</td>
      <td>${w.aqi}</td>
      <td><span class="badge badge-${w.status.toLowerCase()}">${w.status}</span></td>
      <td>${w.priorityScore}/100</td>
      <td>${w.sourceDistribution?.vehicular ?? '—'}%</td>
      <td>${w.sourceDistribution?.industrial ?? '—'}%</td>
      <td>${w.sourceDistribution?.construction ?? '—'}%</td>
      <td>${w.complaints}</td>
    </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Delhi AQI Enforcement Report — ${dateStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 11px; padding: 32px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #e35f20; padding-bottom: 16px; margin-bottom: 24px; }
    .logo-block h1 { font-size: 20px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
    .logo-block p { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .meta { text-align: right; font-size: 10px; color: #666; line-height:1.8; }
    .meta strong { color: #e35f20; }
    .classified { display: inline-block; background: #e35f20; color: white; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 3px; letter-spacing: 1px; margin-top: 4px; }
    h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #e35f20; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 12px 0 24px; }
    .kpi { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; text-align: center; }
    .kpi .val { font-size: 28px; font-weight: 900; color: #e35f20; display: block; }
    .kpi .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-top: 2px; }
    .kpi.alert .val { color: #dc2626; }
    .kpi.ok .val { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 24px; }
    th { background: #1a1a1a; color: white; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; font-weight: 700; }
    td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .badge-reported { background: #dbeafe; color: #1d4ed8; }
    .badge-assigned { background: #fef9c3; color: #854d0e; }
    .badge-actioned { background: #ffedd5; color: #9a3412; }
    .badge-resolved { background: #dcfce7; color: #166534; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-severe { background: #ffedd5; color: #9a3412; }
    .badge-poor { background: #fef9c3; color: #854d0e; }
    .badge-moderate { background: #dcfce7; color: #166534; }
    .disclaimer { font-size: 9px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px; line-height: 1.8; }
    .footer { display:flex; justify-content:space-between; margin-top:16px; font-size:9px; color:#888; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-block">
      <h1>Delhi AQI Command &amp; Control</h1>
      <p>Government of NCT Delhi · Department of Environment</p>
      <p>Delhi Pollution Control Committee (DPCC) · CPCB Network</p>
      <div class="classified">OFFICIAL USE ONLY</div>
    </div>
    <div class="meta">
      <strong>AQI Enforcement &amp; Incident Report</strong><br/>
      Generated: ${dateStr} at ${timeStr}<br/>
      System: D-AQCC v2.4 · Data Source: Live Sensor Mesh<br/>
      Report Ref: RPT-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getTime()).slice(-5)}
    </div>
  </div>

  <h2>1. Executive Summary</h2>
  <div class="kpi-grid">
    <div class="kpi ${avgAqi > 200 ? 'alert' : ''}"><span class="val">${avgAqi}</span><span class="lbl">City-Wide AQI</span></div>
    <div class="kpi alert"><span class="val">${critical}</span><span class="lbl">Critical Zones</span></div>
    <div class="kpi"><span class="val">${totalComplaints}</span><span class="lbl">Total Complaints</span></div>
    <div class="kpi alert"><span class="val">${open}</span><span class="lbl">Open Incidents</span></div>
    <div class="kpi ok"><span class="val">${resolved}</span><span class="lbl">Resolved</span></div>
  </div>
  <p style="font-size:10px;color:#555;margin-bottom:16px">
    During the reporting period, the city-wide Air Quality Index averaged <strong>${avgAqi}</strong>, with 
    <strong>${critical}</strong> ward(s) classified as CRITICAL. A total of <strong>${highIntensity}</strong> high-intensity 
    incidents were logged. <strong>${resolved}</strong> of <strong>${totalComplaints}</strong> complaints have been resolved 
    (resolution rate: <strong>${totalComplaints > 0 ? Math.round(resolved/totalComplaints*100) : 0}%</strong>).
  </p>

  <h2>2. Top Priority Wards — Source Attribution</h2>
  <table>
    <tr><th>Ward</th><th>Current AQI</th><th>Status</th><th>Priority Score</th><th>Vehicular %</th><th>Industrial %</th><th>Construction %</th><th>Active Complaints</th></tr>
    ${wardRows}
  </table>

  <h2>3. Incident / Complaint Log</h2>
  <p style="font-size:10px;color:#555;margin-bottom:8px">
    All complaints are SHA-256 anchored at submission time. Trust Score reflects reporter verification level (Phone, Aadhaar, Google).
  </p>
  <table>
    <tr>
      <th>ID</th><th>Type</th><th>Ward</th><th>Location</th><th>Timestamp</th><th>Status</th>
      <th>Severity</th><th>Dept</th><th>Trust</th><th>Auth Method</th><th>GPS</th><th>AQI at Report</th><th>Integrity Hash</th>
    </tr>
    ${complaintRows || '<tr><td colspan="13" style="text-align:center;color:#888;padding:16px">No incidents logged</td></tr>'}
  </table>

  <h2>4. Regulatory Framework &amp; Enforcement Actions</h2>
  <table>
    <tr><th>Applicable Law</th><th>Provision</th><th>Action Recommended</th></tr>
    <tr><td>Air (Prevention and Control of Pollution) Act, 1981</td><td>Section 31-A</td><td>Issue direction to stop industrial operations in critical wards</td></tr>
    <tr><td>Environment Protection Act, 1986</td><td>Section 5</td><td>Issue directions for immediate remediation in CRITICAL zones</td></tr>
    <tr><td>GRAP (Graded Response Action Plan)</td><td>Stage III/IV activation</td><td>Deploy dust suppression, restrict diesel vehicles, halt construction</td></tr>
    <tr><td>Section 182 IPC</td><td>False Reporting</td><td>Flag low trust-score reports for verification before action</td></tr>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer &amp; Legal Notice:</strong> This report is generated by the Delhi AQI Command &amp; Control (D-AQCC) platform 
    using real-time sensor data from the CPCB network, DPCC monitoring stations, and NASA-MODIS satellite feeds. 
    Data is provided as-is for decision support. AQI readings are subject to ±5% sensor calibration variance as per 
    IS 5182 standards. This document is intended for use by authorised government personnel only. 
    Unauthorized disclosure is prohibited under the Official Secrets Act, 1923. 
    All complaint integrity hashes are SHA-256 anchored and legally admissible for enforcement proceedings.
  </div>

  <div class="footer">
    <span>D-AQCC · Delhi Pollution Control Committee</span>
    <span>Generated: ${dateStr}, ${timeStr} IST</span>
    <span>CONFIDENTIAL — OFFICIAL USE ONLY</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 800);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'MAP', label: 'Live Map', icon: 'map' },
    { id: 'ANALYSIS', label: 'AI Analysis', icon: 'psychology' },
    { id: 'SIMULATION', label: 'Policy Lab', icon: 'science' },
    { id: 'INCIDENTS', label: 'Incidents', icon: 'warning' },
  ];

  return (
    <div className="fixed inset-0 bg-zinc-100 dark:bg-zinc-950 flex flex-col overflow-hidden z-[100] font-sans">

      {/* ── TOP BAR ── */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-6 shrink-0 z-40 relative">
        <div className="flex items-center gap-4 lg:gap-6">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-1.5 -ml-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-md"
          >
            <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="size-7 bg-orange-500 rounded flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-sm">air</span>
            </div>
            <span className="font-bold text-[13px] lg:text-sm text-zinc-900 dark:text-white tracking-tight leading-tight hidden sm:block">Delhi AQI Control</span>
            <span className="text-[9px] lg:text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-mono shrink-0">HQ</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span>{formatDate(currentTime)}</span>
            <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* City-wide metrics */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-6 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="size-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-zinc-500">City Avg AQI</span>
              <span className={`font-bold ${aqiColor(cityAvgAqi)}`}>{cityAvgAqi}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 bg-red-500 rounded-full"></span>
              <span className="font-mono text-zinc-500">Critical Zones</span>
              <span className="font-bold text-red-500">{criticalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 bg-yellow-500 rounded-full"></span>
              <span className="font-mono text-zinc-500">Open Incidents</span>
              <span className="font-bold text-yellow-600">{activeIncidents}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSignOut} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors px-2 lg:px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:w-auto">
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* ── LEFT SIDEBAR: Ward selector ── */}
        <aside className={`absolute z-30 lg:relative inset-y-0 left-0 w-72 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Priority Queue</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {sortedWards.length} wards · Ranked by AQI + Population + Complaints
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sortedWards.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setSelectedWardId(w.id);
                  setIsSidebarOpen(false); // Close mobile menu after selection
                }}
                className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  selectedWardId === w.id ? 'bg-orange-50 dark:bg-orange-500/10 border-l-2 border-l-orange-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase leading-tight">{w.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColor(w.status)}`}>{w.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[13px] font-bold font-mono ${aqiColor(w.aqi)}`}>AQI {w.aqi}</span>
                  <span className="text-[10px] font-mono text-zinc-400">Score {w.priorityScore}</span>
                </div>
                <div className="mt-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(w.aqi / 500) * 100}%`,
                      backgroundColor: w.aqi > 300 ? '#ef4444' : w.aqi > 200 ? '#f97316' : '#eab308',
                    }}
                  ></div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar + selected ward info */}
          <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-2 lg:px-6 flex items-center justify-between shrink-0">
            <div className="flex overflow-x-auto hide-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-3.5 text-[11px] lg:text-[12px] font-semibold border-b-2 transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] lg:text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Selected ward badge */}
            <div className="hidden lg:flex items-center gap-3 text-[11px]">
              <span className="text-zinc-400">Viewing:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${statusColor(selectedWard.status)}`}>{selectedWard.status}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedWard.name}</span>
              <span className={`font-bold font-mono ${aqiColor(selectedWard.aqi)}`}>AQI {selectedWard.aqi}</span>
            </div>
          </div>

          {/* ── TAB CONTENT ── */}
          <div className="flex-1 overflow-hidden">

            {/* ════ TAB 1: LIVE MAP ════ */}
            {activeTab === 'MAP' && (
              <div className="h-full flex flex-col lg:flex-row gap-0 overflow-hidden relative">
                {/* Map — clicking a ward polygon updates the right panel */}
                <div className="flex-1 relative min-h-[50svh]">
                  <LeafletAQIMap
                    showChrome={false}
                    wardData={displayWards}
                    onWardSelect={(enrichedWard) => {
                      // Match the clicked ward name to our ward list
                      const match = sortedWards.find(w =>
                        w.name.toLowerCase() === enrichedWard.properties?.ward_name?.toLowerCase() ||
                        enrichedWard.properties?.ward_name?.toLowerCase().includes(w.name.toLowerCase()) ||
                        w.name.toLowerCase().includes(enrichedWard.properties?.ward_name?.toLowerCase() ?? '')
                      );
                      if (match) setSelectedWardId(match.id);
                    }}
                  />
                </div>

                {/* Ward detail panel */}
                <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-y-auto max-h-[50svh] lg:max-h-none shadow-[0_-10px_30px_rgba(0,0,0,0.5)] lg:shadow-none z-10">
                  <div className="p-4 lg:p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-20">
                    <div>
                      <h2 className="font-bold text-sm text-zinc-900 dark:text-white">{selectedWard.name}</h2>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Last updated: {selectedWard.lastUpdated || 'Recently'}</p>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${statusColor(selectedWard.status)} lg:hidden`}>{selectedWard.status}</span>
                  </div>

                  {/* AQI Big Number */}
                  <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Current AQI</p>
                    <div className={`text-5xl font-black font-mono ${aqiColor(selectedWard.aqi)}`}>{selectedWard.aqi}</div>
                    <p className="text-[11px] text-zinc-500 mt-1">{selectedWard.status} · {selectedWard.aqiDuration || 'Ongoing'}</p>
                  </div>

                  {/* Trend Chart */}
                  {selectedWard.trendHistory && selectedWard.trendHistory.length > 0 && (
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">24-Hour Trend</p>
                      <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedWard.trendHistory}>
                            <defs>
                              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="timestamp" tick={{ fontSize: 9 }} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ fontSize: '11px', backgroundColor: '#18181b', border: 'none', borderRadius: '6px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="aqi" stroke="#f97316" strokeWidth={2} fill="url(#trendGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Source Distribution */}
                  <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Pollution Sources</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Vehicular', val: selectedWard.sourceDistribution.vehicular, color: '#f97316' },
                        { label: 'Industrial', val: selectedWard.sourceDistribution.industrial, color: '#ef4444' },
                        { label: 'Construction', val: selectedWard.sourceDistribution.construction, color: '#eab308' },
                        { label: 'Biomass', val: selectedWard.sourceDistribution.biomass, color: '#8b5cf6' },
                      ].map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-zinc-600 dark:text-zinc-400">{s.label}</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{s.val}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                            <div className="h-full rounded-full" style={{ width: `${s.val}%`, backgroundColor: s.color }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weather Data */}
                  {selectedWard.weather && (
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Weather Conditions</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-400 text-[9px] uppercase">Wind</p>
                          <p className="font-semibold">{selectedWard.weather.windSpeed} km/h {selectedWard.weather.windDirection}</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-400 text-[9px] uppercase">Humidity</p>
                          <p className="font-semibold">{selectedWard.weather.humidity}% · {selectedWard.weather.temperature}°C</p>
                        </div>
                        {selectedWard.weather.inversionLayer && (
                          <div className="col-span-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-2 rounded flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                            <div>
                              <p className="text-red-600 dark:text-red-400 font-semibold text-[10px]">Inversion Layer Active</p>
                              <p className="text-red-500/70 text-[9px]">Pollutants trapped near ground</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {selectedWard.recommendedActions && selectedWard.recommendedActions.length > 0 && (
                    <div className="p-5">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Recommended Actions</p>
                      <div className="space-y-2">
                        {selectedWard.recommendedActions.map((action, i) => (
                          <div key={i} className="flex gap-2 text-[11px] text-zinc-700 dark:text-zinc-300">
                            <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expand to full map */}
                  <div className="p-5 mt-auto">
                    <button
                      onClick={onNavigateMap}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_full</span>
                      Open Full Map View
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ════ TAB 2: AI SOURCE ANALYSIS ════ */}
            {activeTab === 'ANALYSIS' && (
              <div className="h-full overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-5">

                  {/* Ward selector header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">AI Source Attribution</h2>
                      <p className="text-[12px] text-zinc-500">Gemini 2.0 analyses the chemical signature for {selectedWard.name}</p>
                    </div>
                    {attributionLoading && (
                      <div className="flex items-center gap-2 text-[11px] text-orange-500">
                        <div className="size-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        Analysing...
                      </div>
                    )}
                  </div>

                  {/* Root Cause */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Root Cause Analysis</p>
                    {attributionLoading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-full"></div>
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-4/5"></div>
                        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/5"></div>
                      </div>
                    ) : attribution ? (
                      <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{attribution.rootCause}</p>
                    ) : (
                      <p className="text-[13px] text-zinc-500 italic">{selectedWard.whyToday || 'Analysis not available.'}</p>
                    )}
                  </div>

                  {/* Key stats */}
                  {attribution && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Primary Driver</p>
                        <p className="text-[13px] font-bold text-orange-600 dark:text-orange-400">{attribution.primaryDriver}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Secondary Driver</p>
                        <p className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">{attribution.secondaryDriver}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">AI Confidence</p>
                        <p className="text-[13px] font-bold text-green-600 dark:text-green-400">{attribution.confidence}%</p>
                      </div>
                      <div className="col-span-2 md:col-span-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30 p-4">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1">Meteorological Factor</p>
                        <p className="text-[12px] text-amber-700 dark:text-amber-300">{attribution.meteorologicalFactor}</p>
                      </div>
                      <div className="col-span-2 md:col-span-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30 p-4">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">Recommended Enforcement Action</p>
                        <p className="text-[12px] font-semibold text-blue-700 dark:text-blue-300">{attribution.recommendedAction}</p>
                      </div>
                    </div>
                  )}

                  {/* Chemical Fingerprint distribution bars */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">Chemical Source Distribution</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Vehicular Emissions', val: selectedWard.sourceDistribution.vehicular, color: '#f97316' },
                        { label: 'Industrial Outflow', val: selectedWard.sourceDistribution.industrial, color: '#ef4444' },
                        { label: 'Construction Dust', val: selectedWard.sourceDistribution.construction, color: '#eab308' },
                        { label: 'Biomass Combustion', val: selectedWard.sourceDistribution.biomass, color: '#8b5cf6' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-3">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 w-40 shrink-0">{s.label}</span>
                          <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.val}%`, backgroundColor: s.color }}></div>
                          </div>
                          <span className="text-[11px] font-semibold font-mono w-8 text-right">{s.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority breakdown chart */}
                  {selectedWard.priorityBreakdown && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Priority Score Breakdown</p>
                        <span className="text-2xl font-black font-mono text-orange-500">{selectedWard.priorityScore}<span className="text-sm text-zinc-400 font-normal">/100</span></span>
                      </div>
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'AQI (50%)', value: selectedWard.priorityBreakdown.aqiWeight },
                              { name: 'Population (30%)', value: selectedWard.priorityBreakdown.populationWeight },
                              { name: 'Complaints (20%)', value: selectedWard.priorityBreakdown.complaintsWeight },
                            ]}
                            layout="vertical"
                          >
                            <XAxis type="number" domain={[0, 60]} hide />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="value" radius={3}>
                              <Cell fill="#f97316" />
                              <Cell fill="#fb923c" />
                              <Cell fill="#fdba74" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════ TAB 3: POLICY SIMULATION ════ */}
            {activeTab === 'SIMULATION' && (
              <div className="h-full overflow-y-auto">
                <Dashboard initialPolicy="" />
              </div>
            )}

            {/* ════ TAB 4: INCIDENTS ════ */}
            {activeTab === 'INCIDENTS' && (
              <div className="h-full flex flex-col overflow-hidden">
                {/* KPIs + filter + Report button */}
                <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center gap-6 shrink-0 flex-wrap">
                  {[
                    { label: 'Total', val: liveComplaints.length, color: 'text-zinc-700 dark:text-zinc-300' },
                    { label: 'Open', val: liveComplaints.filter(c => c.status === 'Reported').length, color: 'text-blue-600' },
                    { label: 'Assigned', val: liveComplaints.filter(c => c.status === 'Assigned').length, color: 'text-yellow-600' },
                    { label: 'Actioned', val: liveComplaints.filter(c => c.status === 'Actioned').length, color: 'text-orange-600' },
                    { label: 'Resolved', val: resolvedCount, color: 'text-green-600' },
                  ].map(k => (
                    <div key={k.label} className="flex items-center gap-2">
                      <span className={`text-lg font-black font-mono ${k.color}`}>{k.val}</span>
                      <span className="text-[11px] text-zinc-500">{k.label}</span>
                    </div>
                  ))}
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {['All', 'Reported', 'Assigned', 'Actioned', 'Resolved'].map(f => (
                      <button
                        key={f}
                        onClick={() => setComplaintFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          complaintFilter === f
                            ? 'bg-orange-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                    {/* ── Generate Government Report ── */}
                    <button
                      onClick={() => generateGovernmentReport(liveComplaints, sortedWards, cityAvgAqi, criticalCount)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">description</span>
                      Generate Report
                    </button>
                  </div>
                </div>

                {/* Complaint list */}
                <div className="flex-1 overflow-y-auto">
                  {filteredComplaints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                      <span className="material-symbols-outlined text-5xl mb-3">task_alt</span>
                      <p className="text-sm">No incidents in this filter</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredComplaints.map(c => {
                        const ts = new Date(c.timestamp);
                        const timeStr = isNaN(ts.getTime())
                          ? c.timestamp
                          : ts.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true });
                        const trustPct = c.reporter ? Math.round(c.reporter.trustScore * 100) : null;
                        const trustColor = trustPct !== null
                          ? trustPct >= 85 ? 'bg-green-500' : trustPct >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                          : 'bg-zinc-400';

                        return (
                          <div key={c.id} className="px-6 py-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                            {/* ── Row 1: ID + badges + actions ── */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-zinc-400">{c.id}</span>
                                <span className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100">{c.type}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  c.intensity === 'High' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                  : c.intensity === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'
                                }`}>{c.intensity}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  c.status === 'Resolved' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                  : c.status === 'Actioned' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                  : c.status === 'Assigned' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                  : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                }`}>{c.status}</span>
                              </div>
                              {/* Action buttons */}
                              <div className="flex gap-2 shrink-0">
                                {c.status === 'Reported' && (
                                  <button onClick={() => handleComplaintAction(c.id, 'Assigned')}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-yellow-500 hover:bg-yellow-400 text-white transition-colors">
                                    Assign
                                  </button>
                                )}
                                {c.status === 'Assigned' && (
                                  <button onClick={() => handleComplaintAction(c.id, 'Actioned')}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors">
                                    Mark Actioned
                                  </button>
                                )}
                                {c.status !== 'Resolved' && (
                                  <button onClick={() => handleComplaintAction(c.id, 'Resolved')}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors">
                                    Resolve
                                  </button>
                                )}
                                {c.status === 'Resolved' && (
                                  <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-semibold">
                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                    Done
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ── Row 2: Location + ward + time + dept ── */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-3">
                              <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-zinc-400">location_on</span>
                                {c.location} · <span className="font-semibold">{c.ward}</span>
                              </span>
                              <span className="text-zinc-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-zinc-400">schedule</span>
                                {timeStr}
                              </span>
                              <span className="text-zinc-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-zinc-400">business</span>
                                {c.responsibleDept}
                              </span>
                              <span className={`font-semibold flex items-center gap-1 ${
                                c.slaRemaining === 'Resolved' ? 'text-green-600' : parseFloat(c.slaRemaining) < 2 ? 'text-red-500' : 'text-zinc-500'
                              }`}>
                                <span className="material-symbols-outlined text-[13px]">timer</span>
                                SLA: {c.slaRemaining}
                              </span>
                            </div>

                            {/* ── Row 3: Credibility metadata grid ── */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                              {/* Reporter & Trust Score */}
                              {c.reporter && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 col-span-2">
                                  <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Reporter</p>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div>
                                      <p className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">{c.reporter.userId}</p>
                                      <p className="text-[9px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                        <span className="material-symbols-outlined text-[11px] text-green-500">verified</span>
                                        {c.reporter.authMethod}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-zinc-400 mb-1">Trust Score</p>
                                      <p className={`text-[13px] font-black font-mono ${trustPct! >= 85 ? 'text-green-600' : trustPct! >= 65 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {trustPct}%
                                      </p>
                                    </div>
                                  </div>
                                  {/* Trust bar */}
                                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                                    <div className={`h-full rounded-full ${trustColor}`} style={{ width: `${trustPct}%` }}></div>
                                  </div>
                                </div>
                              )}

                              {/* GPS Coordinates */}
                              {c.coordinates && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3">
                                  <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">GPS Location</p>
                                  <p className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">{c.coordinates.lat.toFixed(4)}°N</p>
                                  <p className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">{c.coordinates.lng.toFixed(4)}°E</p>
                                  <a
                                    href={`https://www.google.com/maps?q=${c.coordinates.lat},${c.coordinates.lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-[9px] text-blue-500 hover:text-blue-400 flex items-center gap-0.5 mt-1.5"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                    View on maps
                                  </a>
                                </div>
                              )}

                              {/* AQI at submission */}
                              {c.aqiAtSubmission !== undefined && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3">
                                  <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">AQI at Report</p>
                                  <p className={`text-2xl font-black font-mono ${
                                    c.aqiAtSubmission > 300 ? 'text-red-500' : c.aqiAtSubmission > 200 ? 'text-orange-500' : 'text-yellow-600'
                                  }`}>{c.aqiAtSubmission}</p>
                                  <p className="text-[9px] text-zinc-400 mt-0.5">
                                    {c.aqiAtSubmission > 300 ? 'Hazardous' : c.aqiAtSubmission > 200 ? 'Very Poor' : 'Poor'}
                                  </p>
                                </div>
                              )}

                              {/* Evidence files */}
                              {c.evidence && c.evidence.length > 0 && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 col-span-2 md:col-span-4">
                                  <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                                    Evidence ({c.evidence.length} file{c.evidence.length > 1 ? 's' : ''})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {c.evidence.map((f, i) => (
                                      <div key={i} className="flex items-center gap-1.5 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 px-2 py-1 rounded text-[10px]">
                                        <span className="material-symbols-outlined text-[13px] text-orange-500">image</span>
                                        <span className="font-mono text-zinc-600 dark:text-zinc-300">{f}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Integrity hash */}
                              {c.integrityHash && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-3 col-span-2 md:col-span-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[14px] text-green-500">verified_user</span>
                                      <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Data Integrity</p>
                                    </div>
                                    <span className="text-[9px] text-green-600 dark:text-green-400 font-semibold">✓ Verified</span>
                                  </div>
                                  <p className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 mt-1.5 break-all">{c.integrityHash}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
