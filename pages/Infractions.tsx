import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Label } from '../components/UI';
import { DEPARTAMENTOS, INSPECTORES, LEYES_OPTIONS, InfractionRecord } from '../types';
import { saveInfraction, getInfractions, getCompanies } from '../services/dataService';
import { Loader2, CheckCircle, Calculator, Plus, CalendarClock } from 'lucide-react';

// Hardcoded Holidays for Argentina (2024-2025)
// In a production app, this should ideally come from an API or a config file.
const ARG_HOLIDAYS = [
  // 2024
  "2024-01-01", // Año Nuevo
  "2024-02-12", // Carnaval
  "2024-02-13", // Carnaval
  "2024-03-24", // Memoria
  "2024-03-29", // Viernes Santo
  "2024-04-01", // Puente Turístico
  "2024-04-02", // Malvinas
  "2024-05-01", // Trabajador
  "2024-05-25", // Revolución de Mayo
  "2024-06-17", // Güemes
  "2024-06-20", // Belgrano
  "2024-06-21", // Puente
  "2024-07-09", // Independencia
  "2024-08-17", // San Martín
  "2024-10-11", // Puente
  "2024-10-12", // Diversidad Cultural
  "2024-11-18", // Soberanía (Moved)
  "2024-12-08", // Inmaculada
  "2024-12-25", // Navidad
  
  // 2025 (Estimated/Fixed)
  "2025-01-01",
  "2025-03-03", // Carnaval
  "2025-03-04", // Carnaval
  "2025-03-24",
  "2025-04-02",
  "2025-04-18", // Viernes Santo
  "2025-05-01",
  "2025-05-25",
  "2025-06-20",
  "2025-07-09",
  "2025-08-17",
  "2025-10-12",
  "2025-11-20",
  "2025-12-08",
  "2025-12-25"
];

export const InfractionsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextId, setNextId] = useState<number>(0);
  const [companies, setCompanies] = useState<string[]>([]);
  
  // Custom law state
  const [customLaws, setCustomLaws] = useState<string[]>([]);
  const [newLawInput, setNewLawInput] = useState('');
  
  const [formData, setFormData] = useState<Partial<InfractionRecord>>({
    inspector1: INSPECTORES[0],
    inspector2: '',
    localidad: DEPARTAMENTOS[0],
    leyes: [],
    vencido: 0,
    decomiso: 0,
    presentoDescargo: false,
    estado: 'Pendiente',
    fechaActa: new Date().toISOString().split('T')[0]
  });

  // Calculate next ID on mount
  useEffect(() => {
    const init = async () => {
      const data = await getInfractions();
      const maxId = data.length > 0 ? Math.max(...data.map(d => d.id)) : 0;
      setNextId(maxId + 1);

      try {
        const comps = await getCompanies();
        setCompanies(comps);
      } catch (e) { console.error(e); }
    };
    init();
  }, [success]); // Re-fetch when a success event happens

  // Derived state for multiple selection
  const handleLawToggle = (law: string) => {
    const currentLaws = formData.leyes || [];
    const newLaws = currentLaws.includes(law) 
      ? currentLaws.filter(l => l !== law)
      : [...currentLaws, law];
    
    setFormData(prev => ({ ...prev, leyes: newLaws }));
  };

  const handleAddCustomLaw = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newLawInput.trim()) return;

    const val = newLawInput.trim().toUpperCase();
    
    // Add to custom laws list if not already there and not in default options
    if (!customLaws.includes(val) && !LEYES_OPTIONS.includes(val)) {
      setCustomLaws([...customLaws, val]);
    }
    
    // Auto select it
    if (!formData.leyes?.includes(val)) {
      handleLawToggle(val);
    }
    
    setNewLawInput('');
  };

  const calculateDeadlines = () => {
    const hasArt5 = formData.leyes?.some(l => l.includes("ART. 5") || l.includes("ART. N° 5"));
    const businessDaysToAdd = hasArt5 ? 5 : 10;
    
    // Use Fecha de Acta or fallback to today
    let currentDate = new Date();
    if (formData.fechaActa) {
      // Create date explicitly from parts to avoid timezone shifts (YYYY-MM-DD)
      const [year, month, day] = formData.fechaActa.split('-').map(Number);
      currentDate = new Date(year, month - 1, day);
    }
    
    let daysAdded = 0;
    
    // Loop until we have added the required number of business days
    while (daysAdded < businessDaysToAdd) {
      // Add one day
      currentDate.setDate(currentDate.getDate() + 1);
      
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const dateString = currentDate.toISOString().split('T')[0];
      const isHoliday = ARG_HOLIDAYS.includes(dateString);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Only count if it's not a weekend and not a holiday
      if (!isWeekend && !isHoliday) {
        daysAdded++;
      }
    }

    return { days: businessDaysToAdd, date: currentDate.toISOString().split('T')[0] };
  };

  const validateCUIL = (cuil: string) => {
    if (cuil.length !== 11) return false;
    // Basic length validation for UX, full algo can be added here
    return /^\d+$/.test(cuil);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numeroDigital || !formData.razonSocial || !formData.cuil) {
      alert("Complete campos obligatorios");
      return;
    }
    if (!validateCUIL(formData.cuil)) {
      alert("El CUIL debe tener 11 dígitos numéricos");
      return;
    }

    setLoading(true);
    try {
      const { days, date } = calculateDeadlines();
      
      const payload: any = {
        ...formData,
        diasDescargo: days,
        fechaLimiteDescargo: date
      };

      await saveInfraction(payload);
      setSuccess("Acta guardada correctamente");
      setFormData({
         inspector1: INSPECTORES[0],
         inspector2: '',
         localidad: DEPARTAMENTOS[0],
         leyes: [],
         vencido: 0,
         decomiso: 0,
         presentoDescargo: false,
         estado: 'Pendiente',
         numeroDigital: '',
         ref: '',
         fechaActa: new Date().toISOString().split('T')[0],
         razonSocial: '',
         fantasia: '',
         cuil: ''
      });
      // Keep custom laws for session but clear selection
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const deadlines = calculateDeadlines();
  const allLaws = [...LEYES_OPTIONS, ...customLaws];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-brand-dark mb-4">Actas de Infracción</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Datos del Acta">
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="ID (Auto)" 
                value={nextId} 
                readOnly 
                className="bg-gray-100 text-gray-500 font-mono cursor-not-allowed" 
              />
              <Input 
                label="Número Digital" 
                value={formData.numeroDigital} 
                onChange={e => setFormData({...formData, numeroDigital: e.target.value})} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="N° de Acta" 
                  value={formData.ref} 
                  onChange={e => setFormData({...formData, ref: e.target.value})} 
                  placeholder="Ej: 12345"
                />
                <Input 
                  label="Fecha de Acta" 
                  type="date"
                  value={formData.fechaActa} 
                  onChange={e => setFormData({...formData, fechaActa: e.target.value})} 
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Select label="Inspector 1" options={INSPECTORES} value={formData.inspector1} onChange={e => setFormData({...formData, inspector1: e.target.value})} />
               <Select label="Inspector 2 (Opcional)" options={INSPECTORES} placeholder="Ninguno" value={formData.inspector2} onChange={e => setFormData({...formData, inspector2: e.target.value})} />
            </div>
            <Select label="Localidad" options={DEPARTAMENTOS} value={formData.localidad} onChange={e => setFormData({...formData, localidad: e.target.value})} />
          </Card>

          <Card title="Empresa / Imputado">
            <div>
               <Label required>Razón Social</Label>
               <input 
                 list="companies-list"
                 className="w-full px-4 py-2.5 mb-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
                 value={formData.razonSocial}
                 onChange={e => setFormData({...formData, razonSocial: e.target.value})}
                 required
               />
               <datalist id="companies-list">
                 {companies.map((c, i) => <option key={i} value={c} />)}
               </datalist>
            </div>
            <Input label="Nombre de Fantasía" value={formData.fantasia} onChange={e => setFormData({...formData, fantasia: e.target.value})} />
            <Input 
              label="CUIL (11 dígitos)" 
              value={formData.cuil} 
              onChange={e => setFormData({...formData, cuil: e.target.value})} 
              maxLength={11}
              required 
              placeholder="XXXXXXXXXXX"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Prod. Vencidos (cant)" type="number" value={formData.vencido} onChange={e => setFormData({...formData, vencido: parseInt(e.target.value)})} />
              <Input label="Decomiso (cant)" type="number" value={formData.decomiso} onChange={e => setFormData({...formData, decomiso: parseInt(e.target.value)})} />
            </div>
          </Card>
        </div>

        <Card title="Leyes Infringidas" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allLaws.map(law => (
              <label key={law} className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${formData.leyes?.includes(law) ? 'bg-blue-50 border-brand-primary' : 'hover:bg-gray-50 border-gray-200'}`}>
                <input 
                  type="checkbox" 
                  className="mt-1 mr-3 text-brand-primary rounded focus:ring-brand-primary"
                  checked={formData.leyes?.includes(law)}
                  onChange={() => handleLawToggle(law)}
                />
                <span className="text-sm text-gray-700 break-words">{law}</span>
              </label>
            ))}
          </div>
          
          <div className="mt-5 pt-4 border-t border-gray-100">
             <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Agregar otra ley o artículo</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newLawInput}
                 onChange={e => setNewLawInput(e.target.value)}
                 placeholder="Ej: ART. 10 LEY 24240..."
                 className="flex-1 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
               />
               <button 
                 type="button"
                 onClick={handleAddCustomLaw}
                 className="bg-gray-100 hover:bg-brand-primary hover:text-white text-gray-600 px-4 py-2 rounded-xl transition-colors flex items-center"
                 title="Agregar a la lista"
               >
                 <Plus size={20} />
               </button>
             </div>
          </div>
        </Card>

        <Card className="mt-6 bg-blue-50/50 border-blue-100">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
               <div className="bg-brand-primary text-white p-3 rounded-full mr-4">
                 <CalendarClock size={24} />
               </div>
               <div>
                 <h4 className="font-bold text-brand-dark">Cálculo Automático (Días Hábiles)</h4>
                 <p className="text-sm text-gray-500">Considera fines de semana y feriados nacionales.</p>
               </div>
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Plazo Legal</div>
                <div className="text-2xl font-bold text-brand-dark">{deadlines.days} Días</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">Fecha Límite</div>
                <div className="text-2xl font-bold text-brand-primary">{new Date(deadlines.date.split('-').map(Number).join('/')).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Estado Actual" className="mt-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
             <div className="flex items-center">
                <input type="checkbox" id="descargo" className="w-5 h-5 text-brand-primary mr-3" checked={formData.presentoDescargo} onChange={e => setFormData({...formData, presentoDescargo: e.target.checked})} />
                <label htmlFor="descargo" className="font-medium">¿Presentó Descargo?</label>
             </div>
             {formData.presentoDescargo && (
               <Input label="Fecha Descargo" type="date" value={formData.fechaDescargo || ''} onChange={e => setFormData({...formData, fechaDescargo: e.target.value})} />
             )}
           </div>
        </Card>

        <div className="mt-8 flex justify-end">
          {success && <span className="mr-4 text-green-600 flex items-center font-medium"><CheckCircle size={18} className="mr-2"/> {success}</span>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Acta'}
          </Button>
        </div>
      </form>
    </div>
  );
};