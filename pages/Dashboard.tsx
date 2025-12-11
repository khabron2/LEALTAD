
import React, { useEffect, useState } from 'react';
import { Card, Input, Button, Select } from '../components/UI';
import { getNotifications, getInfractions, updateNotification, deleteNotification, seedData, getInspections } from '../services/dataService';
import { NotificationRecord, InfractionRecord, InspectionRecord, INSPECTORES, NotifType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Calendar, Search, Edit2, Save, X, FileText, Gavel, Truck, AlertCircle, Trash2, Loader2, Printer, ClipboardCheck } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [infractions, setInfractions] = useState<InfractionRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<NotificationRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Report State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    end: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    seedData(); // Ensure mock data exists
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [n, i, insp] = await Promise.all([getNotifications(), getInfractions(), getInspections()]);
      setNotifications(n || []); // Ensure array
      setInfractions(i || []); // Ensure array
      setInspections(insp || []); // Ensure array
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  // --- STATS CALCULATION ---

  // 1. General Totals
  const totalNotifs = notifications.length;
  const totalActas = infractions.length;
  
  // 2. Notification Subtypes
  const audienciasCount = notifications.filter(n => n.tipo === NotifType.AUDIENCIA).length;
  const imputacionesCount = notifications.filter(n => n.tipo === NotifType.IMPUTACION).length;
  const preventivasCount = notifications.filter(n => n.tipo === NotifType.PREVENTIVA).length;
  const trasladosCount = notifications.filter(n => n.tipo === NotifType.TRASLADO).length;

  // 3. Inspections / De Oficio
  const totalInspections = inspections.length;
  const totalDeOficio = inspections.filter(i => i.esActuacionDeOficio).length;

  // 4. Infringed Laws Stats
  const lawStats = infractions.flatMap(i => i.leyes || []).reduce((acc, law) => {
    // Normalize string to avoid duplicates with casing issues
    const normalizedLaw = law.trim(); 
    acc[normalizedLaw] = (acc[normalizedLaw] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedLaws = (Object.entries(lawStats) as [string, number][])
    .sort((a, b) => b[1] - a[1]) // Sort desc by count
    .slice(0, 8); // Top 8

  // 5. Chart Data (By Month/Type)
  const typeCounts = notifications.reduce((acc, curr) => {
    const type = curr.tipo || 'Desconocido';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.keys(typeCounts).map(k => ({ name: k.replace('NOTIFICACIÓN ', '').replace('AUTO DE ', ''), value: typeCounts[k] }));
  const COLORS = ['#0A4C83', '#4FA7FF', '#93C5FD', '#1E3A8A'];

  // 6. Alert Logic
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 999;
    const today = new Date();
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const upcomingAudiences = notifications.filter(n => {
    // If it is already notified, remove the alert
    if (n.notificado) return false;

    if (n.tipo !== NotifType.AUDIENCIA || !n.fechaAudiencia) return false;
    const days = getDaysDiff(n.fechaAudiencia);
    return days <= 12 && days >= -1; // Show overdue recently or upcoming
  });

  // Filter Logic
  const filteredList = notifications.filter(n => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const ref = String(n.ref || '').toLowerCase();
    const dirigidoA = String(n.dirigidoA || '').toLowerCase();
    const contra = String(n.contra || '').toLowerCase();
    const id = String(n.id || '');
    
    return ref.includes(term) || 
           dirigidoA.includes(term) || 
           contra.includes(term) ||
           id.includes(term);
  });

  // Edit Logic
  const startEdit = (rec: NotificationRecord) => {
    setEditingId(rec.id);
    setEditForm(rec);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;

    // Create updated record object
    const updatedRecord = { ...editForm } as NotificationRecord;
    
    // Backup current state for rollback
    const previousNotifications = [...notifications];

    // Optimistic Update: Update UI immediately
    setNotifications(prev => prev.map(n => n.id === editingId ? updatedRecord : n));
    setEditingId(null); // Exit edit mode immediately
    setIsSaving(true);

    try {
      await updateNotification(updatedRecord);
      // Success - no need to do anything as UI is already updated
    } catch (error) {
      console.error(error);
      alert("Error al guardar los cambios. Verifique que su Google Apps Script tenga habilitada la función 'updateNotification'.");
      // Rollback UI
      setNotifications(previousNotifications);
      setEditingId(updatedRecord.id); // Re-open edit
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Referencia: ¿Es seguro eliminar el expediente?")) {
      return;
    }

    // Store previous state for rollback
    const previousNotifications = [...notifications];

    // Optimistic Update: Update UI immediately
    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      await deleteNotification(id);
      // We don't need to reload immediately because we already updated the UI.
      // We can reload silently in the background if we want to sync.
    } catch (e) {
      console.error(e);
      // Revert if error
      setNotifications(previousNotifications);
      alert("Error al eliminar. Verifique su conexión con Google Sheets.");
    }
  };

  // --- REPORT GENERATION ---
  const handleGenerateReport = () => {
    if (!reportRange.start || !reportRange.end) return alert("Seleccione un rango de fechas");

    const start = new Date(reportRange.start);
    const end = new Date(reportRange.end);
    end.setHours(23, 59, 59, 999);

    // Filter Data
    const rNotifs = notifications.filter(n => {
      const d = new Date(n.fechaIngreso);
      return d >= start && d <= end;
    });

    const rInfractions = infractions.filter(i => {
      const d = new Date(i.fechaIngreso);
      return d >= start && d <= end;
    });

    const rInspections = inspections.filter(i => {
      const d = new Date(i.fecha);
      return d >= start && d <= end;
    });

    // Calc Stats
    const rTotalNotifs = rNotifs.length;
    const rTotalActas = rInfractions.length;
    const rTotalInspections = rInspections.length;
    const rTotalDeOficio = rInspections.filter(i => i.esActuacionDeOficio).length;

    const rAudiencias = rNotifs.filter(n => n.tipo === NotifType.AUDIENCIA).length;
    const rImputaciones = rNotifs.filter(n => n.tipo === NotifType.IMPUTACION).length;
    const rTotalVencidos = rInfractions.reduce((sum, i) => sum + (i.vencido || 0), 0);

    // HTML Content
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Informe de Gestión - Lealtad Comercial</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
           body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
           @media print { @page { margin: 1cm; size: A4; } }
        </style>
      </head>
      <body class="bg-white text-gray-800 p-8 max-w-[210mm] mx-auto">
        
        <!-- Header -->
        <div class="border-b-4 border-blue-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 class="text-3xl font-bold text-blue-900 leading-tight">LEALTAD COMERCIAL</h1>
            <p class="text-blue-600 font-bold text-sm tracking-widest uppercase mt-1">Ministerio de Industria, Comercio y Empleo</p>
            <p class="text-gray-500 text-xs uppercase tracking-widest mt-0.5">Provincia de Catamarca</p>
          </div>
          <div class="text-right">
             <div class="text-4xl text-gray-200 font-bold mb-1"><svg class="inline-block w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
             <p class="text-xs text-gray-500 font-medium">Emitido el: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <!-- Title & Summary -->
        <div class="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
           <h2 class="text-xl font-bold text-blue-900 mb-3">Informe de Gestión Administrativa</h2>
           <p class="text-gray-700 text-sm leading-relaxed text-justify">
             El presente informe detalla las actuaciones realizadas por el <strong>Departamento de Lealtad Comercial</strong>, 
             abarcando notificaciones, actas de infracción y actuaciones de oficio gestionadas durante el período comprendido entre el 
             <strong>${start.toLocaleDateString()}</strong> y el <strong>${end.toLocaleDateString()}</strong>.
           </p>
        </div>

        <!-- Key Metrics Grid -->
        <div class="mb-2 text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-2">Métricas Generales</div>
        <div class="grid grid-cols-4 gap-4 mb-10 mt-6">
           <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="text-2xl font-bold text-blue-900 mb-1">${rTotalNotifs}</div>
              <div class="text-[10px] text-gray-500 font-semibold uppercase">Notificaciones</div>
           </div>
           <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="text-2xl font-bold text-blue-900 mb-1">${rTotalActas}</div>
              <div class="text-[10px] text-gray-500 font-semibold uppercase">Actas Infracción</div>
           </div>
           <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="text-2xl font-bold text-blue-900 mb-1">${rTotalInspections}</div>
              <div class="text-[10px] text-gray-500 font-semibold uppercase">Actas Inspección</div>
           </div>
           <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div class="text-2xl font-bold text-red-600 mb-1">${rTotalVencidos}</div>
              <div class="text-[10px] text-gray-500 font-semibold uppercase">Prod. Vencidos</div>
           </div>
        </div>

        <!-- Breakdown -->
        <div class="mb-2 text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-2">Desglose Operativo</div>
        <div class="grid grid-cols-2 gap-8 mt-6 mb-12">
            <div class="space-y-4">
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <span class="font-medium text-gray-700">Audiencias Programadas</span>
                    <span class="font-bold text-blue-800">${rAudiencias}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <span class="font-medium text-gray-700">Autos de Imputación</span>
                    <span class="font-bold text-blue-800">${rImputaciones}</span>
                </div>
                <div class="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-100">
                    <span class="font-medium text-blue-800">Actuaciones de Oficio</span>
                    <span class="font-bold text-blue-800">${rTotalDeOficio}</span>
                </div>
            </div>
            <div class="space-y-4">
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <span class="font-medium text-gray-700">Promedio Diario (Notif.)</span>
                    <span class="font-bold text-gray-600">${(rTotalNotifs / Math.max(1, (end.getTime() - start.getTime()) / (1000*60*60*24))).toFixed(1)}</span>
                </div>
                 <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <span class="font-medium text-gray-700">Promedio Diario (Actas)</span>
                    <span class="font-bold text-gray-600">${(rTotalActas / Math.max(1, (end.getTime() - start.getTime()) / (1000*60*60*24))).toFixed(1)}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="fixed bottom-12 left-0 right-0 px-12 text-center">
            <div class="border-t border-gray-300 pt-4 flex justify-between text-[10px] text-gray-400 uppercase">
                <span>Departamento Lealtad Comercial</span>
                <span>Sistema de Gestión Interna</span>
                <span>Página 1 de 1</span>
            </div>
        </div>

        <script>
           window.print();
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
    } else {
      alert("Por favor habilite las ventanas emergentes para generar el informe.");
    }
    setShowReportModal(false);
  };


  // --- RENDER ---

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-fade-in">
             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                   <Printer size={20} className="text-brand-primary"/> Generar Informe
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
             </div>
             <p className="text-sm text-gray-500 mb-6">Seleccione el rango de fechas para generar el reporte estadístico oficial en formato PDF.</p>
             
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input type="date" className="w-full border rounded-lg p-2.5 bg-gray-50" value={reportRange.start} onChange={e => setReportRange({...reportRange, start: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input type="date" className="w-full border rounded-lg p-2.5 bg-gray-50" value={reportRange.end} onChange={e => setReportRange({...reportRange, end: e.target.value})} />
                </div>
             </div>

             <div className="mt-8 flex gap-3">
                <button onClick={() => setShowReportModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={handleGenerateReport} className="flex-1 py-2.5 bg-brand-dark text-white rounded-xl font-medium hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20">Imprimir Informe</button>
             </div>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex justify-end -mb-4">
         <button 
           onClick={() => setShowReportModal(true)} 
           className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-brand-dark rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium text-sm"
         >
            <Printer size={16} /> Imprimir Informe
         </button>
      </div>

      {/* 1. Main High Level Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Notificaciones Totales */}
        <div className="bg-brand-dark text-white p-5 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totalNotifs}</div>
            <div className="text-xs opacity-75 uppercase tracking-wide">Notificaciones</div>
          </div>
          <div className="bg-white/10 p-2 rounded-lg"><FileText size={24} /></div>
        </div>
        
        {/* Actas Totales */}
        <div className="bg-white text-brand-dark p-5 rounded-xl shadow border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totalActas}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Actas de Infracción</div>
          </div>
          <div className="bg-blue-50 text-brand-primary p-2 rounded-lg"><Gavel size={24} /></div>
        </div>
        
        {/* De Oficio */}
        <div className="bg-blue-600 text-white p-5 rounded-xl shadow flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totalDeOficio}</div>
            <div className="text-xs opacity-80 uppercase tracking-wide">De Oficio</div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg"><ClipboardCheck size={24} /></div>
        </div>

        {/* Alertas */}
        <div className="bg-brand-warning text-white p-5 rounded-xl shadow flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{upcomingAudiences.length}</div>
            <div className="text-xs opacity-80 uppercase tracking-wide">Alertas</div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg"><AlertCircle size={24} /></div>
        </div>
      </div>

      {/* 2. Breakdown Subtypes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3 ml-1">Detalle por Tipo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
             <span className="text-sm text-gray-500 mb-1">Audiencias</span>
             <span className="text-2xl font-bold text-brand-dark">{audienciasCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
             <span className="text-sm text-gray-500 mb-1">Imputaciones</span>
             <span className="text-2xl font-bold text-brand-primary">{imputacionesCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
             <span className="text-sm text-gray-500 mb-1">Preventivas</span>
             <span className="text-2xl font-bold text-blue-400">{preventivasCount}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
             <span className="text-sm text-gray-500 mb-1">Traslados</span>
             <span className="text-2xl font-bold text-gray-600">{trasladosCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Search */}
        <div className="lg:col-span-2 space-y-6">
           {upcomingAudiences.length > 0 && (
            <Card title="⚠️ Alertas de Audiencia (Próx. 12 días)" className="border-l-4 border-l-brand-warning">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-gray-500 border-b">
                     <tr>
                       <th className="py-2">Ref</th>
                       <th>Empresa</th>
                       <th>Audiencia</th>
                       <th>Estado</th>
                     </tr>
                   </thead>
                   <tbody>
                     {upcomingAudiences.map(n => {
                       const days = getDaysDiff(n.fechaAudiencia);
                       return (
                         <tr key={n.id} className="border-b last:border-0 hover:bg-yellow-50">
                           <td className="py-3 font-medium">{n.ref}</td>
                           <td>{n.dirigidoA}</td>
                           <td>{new Date(n.fechaAudiencia!).toLocaleDateString()}</td>
                           <td>
                             <span className={`px-2 py-1 rounded text-xs font-bold ${days < 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                               {days < 0 ? 'VENCIDO' : `${days} días`}
                             </span>
                           </td>
                         </tr>
                       )
                     })}
                   </tbody>
                 </table>
               </div>
            </Card>
           )}

           <Card title="Buscador y Editor Rápido">
             <div className="flex gap-4 mb-4">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                 <Input 
                   placeholder="Buscar por Ref, Empresa, Contra, ID..." 
                   className="pl-10 mb-0"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
               </div>
             </div>
             
             <div className="overflow-x-auto max-h-96">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                   <tr>
                     <th className="p-3 rounded-tl-lg">ID</th>
                     <th className="p-3">Ref</th>
                     <th className="p-3">Empresa</th>
                     <th className="p-3">Audiencia</th>
                     <th className="p-3">Notificador</th>
                     <th className="p-3">Fecha Notif.</th>
                     <th className="p-3 rounded-tr-lg text-center">Acción</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {filteredList.map(item => (
                     <tr key={item.id} className="hover:bg-gray-50 group">
                       <td className="p-3 text-gray-400">#{item.id}</td>
                       
                       {editingId === item.id ? (
                         <>
                           <td className="p-2"><input className="w-20 border rounded p-1" value={editForm.ref} onChange={e => setEditForm({...editForm, ref: e.target.value})} /></td>
                           <td className="p-2"><input className="w-full border rounded p-1" value={editForm.dirigidoA} onChange={e => setEditForm({...editForm, dirigidoA: e.target.value})} /></td>
                           <td className="p-2"><input type="date" className="w-full border rounded p-1" value={editForm.fechaAudiencia ? new Date(editForm.fechaAudiencia).toISOString().split('T')[0] : ''} onChange={e => setEditForm({...editForm, fechaAudiencia: e.target.value})} /></td>
                           <td className="p-2">
                             <select className="border rounded p-1 text-xs" value={editForm.notificador} onChange={e => setEditForm({...editForm, notificador: e.target.value})}>
                               {INSPECTORES.map(i => <option key={i} value={i}>{i}</option>)}
                             </select>
                           </td>
                           <td className="p-2">
                             <input 
                               type="date" 
                               className="w-full border border-blue-400 rounded p-1 ring-2 ring-blue-100" 
                               value={editForm.notificado ? new Date(editForm.notificado).toISOString().split('T')[0] : ''} 
                               onChange={e => setEditForm({...editForm, notificado: e.target.value})} 
                             />
                           </td>
                           <td className="p-2 flex gap-1 justify-center">
                             <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 shadow-sm" title="Guardar cambios">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                             </button>
                             <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-300 text-white rounded hover:bg-gray-400" title="Cancelar">
                                <X size={16}/>
                             </button>
                           </td>
                         </>
                       ) : (
                         <>
                           <td className="p-3 font-medium text-brand-dark">{item.ref}</td>
                           <td className="p-3">{item.dirigidoA}</td>
                           <td className="p-3 text-gray-500">{item.fechaAudiencia ? new Date(item.fechaAudiencia).toLocaleDateString() : '-'}</td>
                           <td className="p-3">{item.notificador}</td>
                           <td className="p-3 text-gray-500 italic">{item.notificado ? new Date(item.notificado).toLocaleDateString() : '-'}</td>
                           <td className="p-3 flex gap-2 justify-center">
                             <button onClick={() => startEdit(item)} className="p-1.5 text-brand-primary hover:bg-blue-50 rounded transition-colors" title="Editar">
                               <Edit2 size={16} />
                             </button>
                             <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="Eliminar">
                               <Trash2 size={16} />
                             </button>
                           </td>
                         </>
                       )}
                     </tr>
                   ))}
                 </tbody>
               </table>
               {filteredList.length === 0 && <div className="p-8 text-center text-gray-400">No se encontraron resultados</div>}
             </div>
           </Card>
        </div>

        {/* Right Column: Charts & Lists */}
        <div className="space-y-6">
          <Card title="Ranking de Leyes Infringidas">
            {sortedLaws.length > 0 ? (
                <div className="space-y-3">
                    {sortedLaws.map(([law, count], index) => {
                         // Calculate percentage relative to max for bar width
                         const max = Number(sortedLaws[0]?.[1] || 1);
                         const val = Number(count);
                         const percent = (val / max) * 100;
                         return (
                            <div key={index} className="text-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-gray-700 truncate pr-2 w-3/4" title={law}>{law}</span>
                                    <span className="font-bold text-brand-primary">{count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div 
                                        className="bg-brand-dark h-1.5 rounded-full" 
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                </div>
                            </div>
                         );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 text-sm">No hay actas registradas</div>
            )}
          </Card>

          <Card title="Gráfico de Notificaciones">
            {/* Explicit dimensions with minWidth to fix Recharts width(-1) warning */}
            <div style={{ width: '100%', height: 300, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <Card title="Top Empresas Notificadas">
             <ul className="divide-y divide-gray-100 text-sm">
                {Array.from(new Set(notifications.map(n => n.dirigidoA))).slice(0, 5).map((company, i) => (
                    <li key={i} className="py-3 flex justify-between items-center">
                        <span className="font-medium text-gray-700 truncate w-3/4">{company}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500 text-xs">
                            {notifications.filter(n => n.dirigidoA === company).length}
                        </span>
                    </li>
                ))}
             </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
