import { NotificationRecord, InfractionRecord, InspectionRecord, NotifType } from '../types';

// ==================================================================================
// CONFIGURACIÓN DE CONEXIÓN
// ==================================================================================
// Pega aquí la URL de tu "Web App" de Google Apps Script cuando la hayas desplegado.
// Si lo dejas vacío, la app funcionará en modo "DEMO" guardando datos en el navegador.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6Uj3PSlhrzHTtQFxVybTXDmZCfsE7T-073e3Lp3OkXd1TLVTHPm_q8c1aI1ICDkjz/exec"; 
// Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
// ==================================================================================

// Mock DB Keys (Modo Offline)
const DB_KEYS = {
  NOTIFICATIONS: 'db_notifications',
  INFRACTIONS: 'db_infractions',
  INSPECTIONS: 'db_inspections',
  COMPANIES: 'db_companies'
};

// Helper to simulate delay in Mock mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API HELPER ---
async function apiRequest(action: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  if (!GOOGLE_SCRIPT_URL) throw new Error("No API URL");
  
  // Google Apps Script Web App handles POSTs better with text/plain to avoid CORS preflight complexities in some envs,
  // but standard fetch usually works. We'll use no-cors if simple, but we need response.
  // Standard fetch to GAS Web App requires 'redirect: follow' because GAS redirects to content.
  
  const url = `${GOOGLE_SCRIPT_URL}?action=${action}`;
  
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // GAS simple request
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
    // Map response to match Types if necessary (GAS returns raw objects)
    return data.map((d: any) => ({
      ...d,
      id: Number(d.id),
      anio: Number(d.anio || new Date().getFullYear())
    }));
  }
  
  // Fallback Local
  await delay(300);
  const data = localStorage.getItem(DB_KEYS.NOTIFICATIONS);
  return data ? JSON.parse(data) : [];
};

export const saveNotification = async (record: Omit<NotificationRecord, 'id' | 'fechaIngreso'>): Promise<NotificationRecord> => {
  if (GOOGLE_SCRIPT_URL) {
    return await apiRequest('saveNotification', 'POST', record);
  }

  // Fallback Local
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
    // Note: The basic GAS script provided supports Append. 
    // For update, the GAS script would need an 'update' action.
    // For now, we will just alert in cloud mode or implement later.
    console.warn("Update not fully implemented in basic GAS script");
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

// --- Infractions ---

export const getInfractions = async (): Promise<InfractionRecord[]> => {
  if (GOOGLE_SCRIPT_URL) {
    const data = await apiRequest('getInfractions');
    return data.map((d: any) => ({
       ...d,
       id: Number(d.id),
       vencido: Number(d.vencido),
       decomiso: Number(d.decomiso),
       diasDescargo: Number(d.diasDescargo),
       leyes: typeof d.leyes === 'string' ? d.leyes.split(', ') : d.leyes
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
      id: Number(d.id),
      leyes: typeof d.leyes === 'string' ? d.leyes.split(', ') : d.leyes
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

// Internal local helper
const addCompany = (name: string) => {
  if (!name) return;
  const current = localStorage.getItem(DB_KEYS.COMPANIES);
  const list = current ? JSON.parse(current) : [];
  if (!list.includes(name)) {
    const updated = [...list, name].sort();
    localStorage.setItem(DB_KEYS.COMPANIES, JSON.stringify(updated));
  }
};

// --- Initial Seed Data (Only for Mock) ---
export const seedData = () => {
  if (GOOGLE_SCRIPT_URL) return; // Don't seed if using API
  
  if (!localStorage.getItem(DB_KEYS.NOTIFICATIONS)) {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 5); 

    const farFuture = new Date();
    farFuture.setDate(today.getDate() + 20);

    const seed: NotificationRecord[] = [
      {
        id: 1,
        fechaIngreso: new Date().toISOString().split('T')[0],
        ref: "EXP-001",
        anio: 2024,
        area: "LEALTAD COMERCIAL",
        departamento: "Capital",
        tipo: "NOTIFICACIÓN AUDIENCIA",
        dirigidoA: "Supermercado X",
        contra: "Juan Perez",
        fechaAudiencia: future.toISOString().split('T')[0],
        notificador: "Ponce",
        notificado: today.toISOString().split('T')[0]
      },
      {
        id: 2,
        fechaIngreso: "2024-05-10",
        ref: "EXP-002",
        anio: 2024,
        area: "DEPARTAMENTO JURIDICO",
        departamento: "Valle Viejo",
        tipo: "NOTIFICACIÓN AUDIENCIA",
        dirigidoA: "Electro Hogar",
        contra: "Maria Lopez",
        fechaAudiencia: farFuture.toISOString().split('T')[0],
        notificador: "Molina"
      }
    ];
    localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(seed));
    addCompany("Supermercado X");
    addCompany("Electro Hogar");
  }
};