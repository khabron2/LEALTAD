
import { NotificationRecord, InfractionRecord, InspectionRecord, NotifType } from '../types';

// ==================================================================================
// CONFIGURACIÓN DE CONEXIÓN
// ==================================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6Uj3PSlhrzHTtQFxVybTXDmZCfsE7T-073e3Lp3OkXd1TLVTHPm_q8c1aI1ICDkjz/exec"; 
// ==================================================================================

const DB_KEYS = {
  NOTIFICATIONS: 'db_notifications',
  INFRACTIONS: 'db_infractions',
  INSPECTIONS: 'db_inspections',
  COMPANIES: 'db_companies'
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequest(action: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  if (!GOOGLE_SCRIPT_URL) throw new Error("No API URL");
  
  const timestamp = new Date().getTime();
  const url = `${GOOGLE_SCRIPT_URL}?action=${action}&_t=${timestamp}`;
  
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', 
    },
  };

  if (method === 'POST' && body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  return data;
}

// --- Notifications ---

export const getNotifications = async (): Promise<NotificationRecord[]> => {
  if (GOOGLE_SCRIPT_URL) {
    const data = await apiRequest('getNotifications');
    // Mapeo exhaustivo para manejar diferencias de mayúsculas/minúsculas de Drive
    return data.map((d: any) => ({
      id: Number(d.id || d.ID),
      fechaIngreso: d.fechaIngreso || d['FECHA INGRESO'] || '',
      ref: d.ref || d.REF || '',
      anio: Number(d.anio || d.ANIO || new Date().getFullYear()),
      area: d.area || d.AREA || '',
      departamento: d.departamento || d.DEPARTAMENTO || '',
      tipo: d.tipo || d.TIPO || '',
      dirigidoA: d.dirigidoA || d['DIRIGIDO A'] || '',
      contra: d.contra || d.CONTRA || '',
      fechaAudiencia: d.fechaAudiencia || d['FECHA AUDIENCIA'] || '',
      notificador: d.notificador || d.NOTIFICADOR || '',
      notificado: d.notificado || d.NOTIFICADO || d['FECHA NOTIFICACION'] || ''
    }));
  }
  
  await delay(300);
  const data = localStorage.getItem(DB_KEYS.NOTIFICATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveNotification = async (record: Omit<NotificationRecord, 'id' | 'fechaIngreso'>): Promise<NotificationRecord> => {
  if (GOOGLE_SCRIPT_URL) {
    return await apiRequest('saveNotification', 'POST', record);
  }

  await delay(500);
  const current = await getNotifications();
  const newId = current.length > 0 ? Math.max(...current.map(r => r.id)) + 1 : 1;
  
  const newRecord: NotificationRecord = {
    ...record,
    id: newId,
    fechaIngreso: new Date().toISOString().split('T')[0]
  };

  const updated = [...current, newRecord];
  localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  addCompany(record.dirigidoA);
  return newRecord;
};

export const updateNotification = async (updatedRecord: NotificationRecord): Promise<void> => {
  if (GOOGLE_SCRIPT_URL) {
    // Enviamos el objeto con las claves originales y en mayúsculas para máxima compatibilidad con el Script
    const payload = {
      ...updatedRecord,
      'ID': updatedRecord.id,
      'NOTIFICADO': updatedRecord.notificado,
      'FECHA NOTIFICACION': updatedRecord.notificado,
      'REF': updatedRecord.ref,
      'DIRIGIDO A': updatedRecord.dirigidoA,
      'FECHA AUDIENCIA': updatedRecord.fechaAudiencia,
      'NOTIFICADOR': updatedRecord.notificador
    };

    const result = await apiRequest('updateNotification', 'POST', payload);
    if (!result || (result.success === false)) {
      throw new Error("El servidor no pudo confirmar la actualización.");
    }
    return;
  }

  await delay(300);
  const current = await getNotifications();
  const index = current.findIndex(r => r.id === updatedRecord.id);
  if (index !== -1) {
    current[index] = updatedRecord;
    localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(current));
  }
};

export const deleteNotification = async (id: number): Promise<void> => {
  if (GOOGLE_SCRIPT_URL) {
    await apiRequest('deleteNotification', 'POST', { id });
    return;
  }

  await delay(300);
  const current = await getNotifications();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(updated));
};

// --- Infractions ---

export const getInfractions = async (): Promise<InfractionRecord[]> => {
  if (GOOGLE_SCRIPT_URL) {
    const data = await apiRequest('getInfractions');
    return data.map((d: any) => ({
       ...d,
       id: Number(d.id || d.ID),
       vencido: Number(d.vencido || d.VENCIDO || 0),
       decomiso: Number(d.decomiso || d.DECOMISO || 0),
       diasDescargo: Number(d.diasDescargo || d['DIAS DESCARGO'] || 0),
       leyes: typeof d.leyes === 'string' ? d.leyes.split(', ') : (d.LEYES || d.leyes || []),
    }));
  }

  await delay(300);
  const data = localStorage.getItem(DB_KEYS.INFRACTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveInfraction = async (record: Omit<InfractionRecord, 'id' | 'fechaIngreso'>): Promise<InfractionRecord> => {
  if (GOOGLE_SCRIPT_URL) {
    return await apiRequest('saveInfraction', 'POST', record);
  }

  await delay(500);
  const current = await getInfractions();
  const newId = current.length > 0 ? Math.max(...current.map(r => r.id)) + 1 : 1;
  
  const newRecord: InfractionRecord = {
    ...record,
    id: newId,
    fechaIngreso: new Date().toISOString().split('T')[0]
  };

  const updated = [...current, newRecord];
  localStorage.setItem(DB_KEYS.INFRACTIONS, JSON.stringify(updated));
  addCompany(record.razonSocial);
  return newRecord;
};

// --- Inspections ---

export const getInspections = async (): Promise<InspectionRecord[]> => {
  if (GOOGLE_SCRIPT_URL) {
    const data = await apiRequest('getInspections');
    return data.map((d: any) => ({
      ...d,
      id: Number(d.id || d.ID),
      leyes: typeof d.leyes === 'string' ? d.leyes.split(', ') : (d.LEYES || d.leyes || []),
      esActuacionDeOficio: d.esActuacionDeOficio === true || d.esActuacionDeOficio === 'SI' || d['DE OFICIO'] === 'SI' || d['ES ACTUACION DE OFICIO'] === 'SI'
    }));
  }

  await delay(300);
  const data = localStorage.getItem(DB_KEYS.INSPECTIONS);
  return data ? JSON.parse(data) : [];
};

export const saveInspection = async (record: Omit<InspectionRecord, 'id'>): Promise<InspectionRecord> => {
  if (GOOGLE_SCRIPT_URL) {
    return await apiRequest('saveInspection', 'POST', record);
  }

  await delay(500);
  const current = await getInspections();
  const newId = current.length > 0 ? Math.max(...current.map(r => r.id)) + 1 : 1;
  
  const newRecord: InspectionRecord = {
    ...record,
    id: newId
  };

  const updated = [...current, newRecord];
  localStorage.setItem(DB_KEYS.INSPECTIONS, JSON.stringify(updated));
  addCompany(record.razonSocial);
  return newRecord;
};

// --- Companies ---

export const getCompanies = async (): Promise<string[]> => {
  if (GOOGLE_SCRIPT_URL) {
    return await apiRequest('getCompanies');
  }
  
  await delay(100);
  const data = localStorage.getItem(DB_KEYS.COMPANIES);
  return data ? JSON.parse(data) : [];
};

const addCompany = (name: string) => {
  if (!name) return;
  const current = localStorage.getItem(DB_KEYS.COMPANIES);
  const list = current ? JSON.parse(current) : [];
  if (!list.includes(name)) {
    const updated = [...list, name].sort();
    localStorage.setItem(DB_KEYS.COMPANIES, JSON.stringify(updated));
  }
};

export const seedData = () => {
  if (GOOGLE_SCRIPT_URL) return; 
  if (!localStorage.getItem(DB_KEYS.NOTIFICATIONS)) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 5); 
    const seed: NotificationRecord[] = [
      {
        id: 1,
        fechaIngreso: new Date().toISOString().split('T')[0],
        ref: "EXP-001",
        anio: 2024,
        area: "LEALTAD COMERCIAL",
        departamento: "Capital",
        tipo: "AUDIENCIA", 
        dirigidoA: "Supermercado X",
        contra: "Juan Perez",
        fechaAudiencia: future.toISOString().split('T')[0],
        notificador: "Ponce",
        notificado: today.toISOString().split('T')[0]
      }
    ];
    localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(seed));
    addCompany("Supermercado X");
  }
};
