
import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Label } from '../components/UI';
import { DEPARTAMENTOS, INSPECTORES, LEYES_OPTIONS, InspectionRecord } from '../types';
import { saveInspection, getInspections, getCompanies } from '../services/dataService';
import { CheckCircle, ClipboardList, Plus } from 'lucide-react';

export const InspectionsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [nextId, setNextId] = useState<number>(0);
  const [companies, setCompanies] = useState<string[]>([]);
  
  // Custom Law State
  const [customLaws, setCustomLaws] = useState<string[]>([]);
  const [newLawInput, setNewLawInput] = useState('');

  const [formData, setFormData] = useState<Partial<InspectionRecord>>({
    fecha: new Date().toISOString().split('T')[0],
    inspector1: INSPECTORES[0],
    inspector2: '',
    localidad: DEPARTAMENTOS[0],
    leyes: [],
    ref: '',
    esActuacionDeOficio: false,
    razonSocial: '',
    fantasia: '',
    cuil: ''
  });

  // Calculate next ID
  useEffect(() => {
    const init = async () => {
      const data = await getInspections();
      const maxId = data.length > 0 ? Math.max(...data.map(d => d.id)) : 0;
      setNextId(maxId + 1);

      try {
        const comps = await getCompanies();
        setCompanies(comps);
      } catch (e) { console.error(e); }
    };
    init();
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.razonSocial) return alert("Faltan datos");
    
    setLoading(true);
    await saveInspection(formData as any);
    setLoading(false);
    setSuccess(true);
    setFormData({
        fecha: new Date().toISOString().split('T')[0],
        inspector1: INSPECTORES[0],
        inspector2: '',
        localidad: DEPARTAMENTOS[0],
        leyes: [],
        ref: '',
        razonSocial: '',
        fantasia: '',
        cuil: '',
        esActuacionDeOficio: false
    });
    setTimeout(() => setSuccess(false), 3000);
  };

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
    if (!customLaws.includes(val) && !LEYES_OPTIONS.includes(val)) {
      setCustomLaws([...customLaws, val]);
    }
    
    if (!formData.leyes?.includes(val)) {
      handleLawToggle(val);
    }
    setNewLawInput('');
  };

  const allLaws = [...LEYES_OPTIONS, ...customLaws];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-primary text-white rounded-xl">
            <ClipboardList size={24} />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-brand-dark">Actas de Inspección</h2>
            <p className="text-sm text-gray-500">Carga rápida de actuaciones</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="ID (Auto)" 
                    value={nextId} 
                    readOnly 
                    className="bg-gray-100 text-gray-500 font-mono cursor-not-allowed" 
                  />
                  <Input 
                    label="N° de Acta" 
                    value={formData.ref} 
                    onChange={e => setFormData({...formData, ref: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Fecha" type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required />
                    <Select 
                      label="¿Actuación de Oficio?" 
                      options={[{value: 'NO', label: 'No'}, {value: 'SI', label: 'Si'}]} 
                      value={formData.esActuacionDeOficio ? 'SI' : 'NO'} 
                      onChange={e => setFormData({...formData, esActuacionDeOficio: e.target.value === 'SI'})}
                      className={formData.esActuacionDeOficio ? 'border-brand-primary bg-blue-50' : ''}
                    />
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Fantasía" value={formData.fantasia} onChange={e => setFormData({...formData, fantasia: e.target.value})} />
                    <Input label="CUIL" value={formData.cuil} onChange={e => setFormData({...formData, cuil: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select label="Inspector 1" options={INSPECTORES} value={formData.inspector1} onChange={e => setFormData({...formData, inspector1: e.target.value})} />
                    <Select label="Inspector 2 (Opcional)" options={INSPECTORES} placeholder="Ninguno" value={formData.inspector2} onChange={e => setFormData({...formData, inspector2: e.target.value})} />
                </div>

                <Select label="Departamento" options={DEPARTAMENTOS} value={formData.localidad} onChange={e => setFormData({...formData, localidad: e.target.value})} />
            </div>
            
            <div className="mt-6 border-t pt-4">
                <label className="block text-sm font-medium text-brand-gray mb-3">Leyes Controladas</label>
                <div className="flex flex-wrap gap-2 mb-4">
                    {allLaws.map(law => (
                        <button
                            key={law}
                            type="button"
                            onClick={() => handleLawToggle(law)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.leyes?.includes(law) ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                            {law}
                        </button>
                    ))}
                </div>
                
                <div className="flex gap-2 max-w-md">
                   <input 
                     type="text" 
                     value={newLawInput}
                     onChange={e => setNewLawInput(e.target.value)}
                     placeholder="Agregar otra ley..."
                     className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-xs"
                   />
                   <button 
                     type="button"
                     onClick={handleAddCustomLaw}
                     className="bg-gray-100 hover:bg-brand-primary hover:text-white text-gray-600 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                   >
                     <Plus size={16} />
                   </button>
                </div>
            </div>
        </Card>
        
        <div className="mt-6 flex justify-end">
            {success && <div className="mr-4 text-green-600 flex items-center"><CheckCircle className="mr-2"/> Guardado</div>}
            <Button type="submit" disabled={loading}>Guardar Inspección</Button>
        </div>
      </form>
    </div>
  );
};
