import React, { useEffect, useState } from 'react';
import { Card, Input, Button, Select } from '../components/UI';
import { getNotifications, getInfractions, updateNotification, seedData } from '../services/dataService';
import { NotificationRecord, InfractionRecord, INSPECTORES, NotifType } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Calendar, Search, Edit2, Save, X, FileText, Gavel, Truck, AlertCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [infractions, setInfractions] = useState<InfractionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<NotificationRecord>>({});

  useEffect(() => {
    seedData(); // Ensure mock data exists
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [n, i] = await Promise.all([getNotifications(), getInfractions()]);
      setNotifications(n || []); // Ensure array
      setInfractions(i || []); // Ensure array
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

  // 3. Infringed Laws Stats
  const lawStats = infractions.flatMap(i => i.leyes || []).reduce((acc, law) => {
    // Normalize string to avoid duplicates with casing issues
    const normalizedLaw = law.trim(); 
    acc[normalizedLaw] = (acc[normalizedLaw] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const sortedLaws = Object.entries(lawStats)
    .sort((a, b) => b[1] - a[1]) // Sort desc by count
    .slice(0, 8); // Top 8

  // 4. Chart Data (By Month/Type)
  const typeCounts = notifications.reduce((acc, curr) => {
    const type = curr.tipo || 'Desconocido';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.keys(typeCounts).map(k => ({ name: k.replace('NOTIFICACIÓN ', '').replace('AUTO DE ', ''), value: typeCounts[k] }));
  const COLORS = ['#0A4C83', '#4FA7FF', '#93C5FD', '#1E3A8A'];

  // 5. Alert Logic
  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return 999;
    const today = new Date();
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const upcomingAudiences = notifications.filter(n => {
    if (n.tipo !== "NOTIFICACIÓN AUDIENCIA" || !n.fechaAudiencia) return false;
    const days = getDaysDiff(n.fechaAudiencia);
    return days <= 12 && days >= -1; // Show overdue recently or upcoming
  });

  // Filter Logic
  const filteredList = notifications.filter(n => {
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
    if (editingId && editForm) {
      await updateNotification(editForm as NotificationRecord);
      setEditingId(null);
      loadData();
    }
  };

  // --- RENDER ---

  return (
    <div className="space-y-8 animate-fade-in">
      
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
            <div className="text-xs text-gray-400 uppercase tracking-wide">Actas Infracción</div>
          </div>
          <div className="bg-blue-50 text-brand-primary p-2 rounded-lg"><Gavel size={24} /></div>
        </div>
        
        {/* Alertas */}
        <div className="bg-brand-warning text-white p-5 rounded-xl shadow flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{upcomingAudiences.length}</div>
            <div className="text-xs opacity-80 uppercase tracking-wide">Alertas Vencimiento</div>
          </div>
          <div className="bg-white/20 p-2 rounded-lg"><AlertCircle size={24} /></div>
        </div>

        {/* Mes Actual */}
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex items-center justify-center">
             <div className="text-center">
                 <div className="text-xl font-bold text-brand-primary">
                    {new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()}
                 </div>
                 <div className="text-xs text-gray-400">MES ACTUAL</div>
             </div>
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
                     <th className="p-3 rounded-tr-lg">Acción</th>
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
                           <td className="p-2"><input type="date" className="w-full border rounded p-1" value={editForm.fechaAudiencia || ''} onChange={e => setEditForm({...editForm, fechaAudiencia: e.target.value})} /></td>
                           <td className="p-2">
                             <select className="border rounded p-1 text-xs" value={editForm.notificador} onChange={e => setEditForm({...editForm, notificador: e.target.value})}>
                               {INSPECTORES.map(i => <option key={i} value={i}>{i}</option>)}
                             </select>
                           </td>
                           <td className="p-2">
                             <input type="date" className="w-full border rounded p-1" value={editForm.notificado || ''} onChange={e => setEditForm({...editForm, notificado: e.target.value})} />
                           </td>
                           <td className="p-2 flex gap-1">
                             <button onClick={saveEdit} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"><Save size={16}/></button>
                             <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-300 text-white rounded hover:bg-gray-400"><X size={16}/></button>
                           </td>
                         </>
                       ) : (
                         <>
                           <td className="p-3 font-medium text-brand-dark">{item.ref}</td>
                           <td className="p-3">{item.dirigidoA}</td>
                           <td className="p-3 text-gray-500">{item.fechaAudiencia ? new Date(item.fechaAudiencia).toLocaleDateString() : '-'}</td>
                           <td className="p-3">{item.notificador}</td>
                           <td className="p-3 text-gray-500 italic">{item.notificado ? new Date(item.notificado).toLocaleDateString() : '-'}</td>
                           <td className="p-3">
                             <button onClick={() => startEdit(item)} className="text-brand-primary hover:text-brand-dark opacity-0 group-hover:opacity-100 transition-opacity">
                               <Edit2 size={16} />
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
                         const max = sortedLaws[0][1];
                         const percent = (count / max) * 100;
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
            <div className="h-48 w-full">
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