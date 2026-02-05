
import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Label } from '../components/UI';
import { Area, DEPARTAMENTOS, NotifType, INSPECTORES, NotificationRecord } from '../types';
import { getCompanies, saveNotification } from '../services/dataService';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  
  // Form State
  const [formData, setFormData] = useState<Partial<NotificationRecord>>({
    anio: new Date().getFullYear(),
    area: Area.CONSUMIDOR,
    departamento: DEPARTAMENTOS[0],
    tipo: NotifType.AUDIENCIA,
    notificador: INSPECTORES[0],
    contra: '',
    ref: '',
    dirigidoA: '',
    notificado: ''
  });

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const list = await getCompanies();
        setCompanies(list);
      } catch (error) {
        console.error("Error loading companies", error);
      }
    };
    loadCompanies();
  }, [success]); // Reload companies if a new record might have added one

  const handleChange = (field: keyof NotificationRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);

    try {
      if (!formData.ref || !formData.contra || !formData.dirigidoA) {
        throw new Error("Por favor complete los campos obligatorios");
      }

      await saveNotification(formData as any);
      
      setSuccess("Notificación guardada correctamente.");
      // Reset form partially
      setFormData(prev => ({
        ...prev,
        ref: '',
        contra: '',
        fechaAudiencia: '',
        notificado: ''
      }));
      // Companies will be reloaded by useEffect dependency
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark">Nueva Notificación</h2>
          <p className="text-gray-500 text-sm">Ingrese los datos para generar un nuevo registro</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 uppercase font-semibold">Fecha Ingreso</div>
          <div className="font-mono text-brand-primary text-lg font-bold">{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Detalles del Expediente">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input 
              label="Referencia (N° Expediente)" 
              placeholder="Ej: 2024-001" 
              value={formData.ref}
              onChange={e => handleChange('ref', e.target.value)}
              required
            />
            <Input 
              label="Año" 
              type="number" 
              value={formData.anio}
              onChange={e => handleChange('anio', parseInt(e.target.value))}
              required
            />
            <Select 
              label="Área" 
              options={Object.values(Area)} 
              value={formData.area}
              onChange={e => handleChange('area', e.target.value)}
            />
            <Select 
              label="Departamento" 
              options={DEPARTAMENTOS} 
              value={formData.departamento}
              onChange={e => handleChange('departamento', e.target.value)}
            />
          </div>
        </Card>

        <Card title="Detalles de la Notificación" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select 
              label="Tipo de Notificación" 
              options={Object.values(NotifType)} 
              value={formData.tipo}
              onChange={e => handleChange('tipo', e.target.value)}
              required
            />
            
            {/* Shared Datalist for autocomplete */}
            <datalist id="companies-list">
              {companies.map((c, i) => <option key={i} value={c} />)}
            </datalist>

            <div>
               <Label required>Dirigido A (Empresa)</Label>
               <input 
                 list="companies-list"
                 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
                 value={formData.dirigidoA}
                 onChange={e => handleChange('dirigidoA', e.target.value)}
                 placeholder="Escriba o seleccione..."
               />
            </div>

            <div>
               <Label required>Contra (Nombre Persona/Entidad)</Label>
               <input 
                 list="companies-list"
                 className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all text-sm"
                 value={formData.contra}
                 onChange={e => handleChange('contra', e.target.value)}
                 placeholder="Escriba o seleccione..."
                 required
               />
            </div>

            {formData.tipo === NotifType.AUDIENCIA && (
              <Input 
                label="Fecha de Audiencia" 
                type="date"
                value={formData.fechaAudiencia || ''}
                onChange={e => handleChange('fechaAudiencia', e.target.value)}
                required
                className="border-brand-primary border-2"
              />
            )}
          </div>
        </Card>

        <Card title="Personal Asignado" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select 
              label="Notificador" 
              options={INSPECTORES} 
              value={formData.notificador}
              onChange={e => handleChange('notificador', e.target.value)}
            />
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-end gap-4">
          {success && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center text-sm animate-fade-in">
              <CheckCircle size={16} className="mr-2" /> {success}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full md:w-auto">
            {loading ? <span className="flex items-center"><Loader2 className="animate-spin mr-2"/> Guardando...</span> : "Guardar Registro"}
          </Button>
        </div>
      </form>
    </div>
  );
};
