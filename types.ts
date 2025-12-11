
export enum Area {
  CONSUMIDOR = "DEFENSA DEL CONSUMIDOR",
  JURIDICO = "DEPARTAMENTO JURIDICO",
  LEALTAD = "LEALTAD COMERCIAL",
  OTROS = "OTROS"
}

export const DEPARTAMENTOS = [
  "Capital", "Valle Viejo", "Fray Mamerto Esquiú", "Andalgalá", "Belén", 
  "Santa María", "Tinogasta", "Pomán", "Capayán", "La Paz", "Paclín", 
  "El Alto", "Ancasti", "Santa Rosa", "Antofagasta de la Sierra", "Recreo"
];

export enum NotifType {
  AUDIENCIA = "AUDIENCIA",
  IMPUTACION = "AUTO DE IMPUTACIÓN",
  PREVENTIVA = "PREVENTIVA",
  TRASLADO = "TRASLADO"
}

export const INSPECTORES = [
  "Patato", "Nieva", "Ahumada", "Rodriguez", "Molina", "Ponce", "Inspectores", "Reartes"
];

export const LEYES_OPTIONS = [
  "ART. N° 5 LEY 24240",
  "ART. N° 42 CN",
  "ART. 5 LEY 24240 + ART. 42 CN",
  "ART. 1 RES E-51",
  "ART. 11 DNU 274/19",
  "ART. 75 DNU 274/19",
  "ART. 2 INC C RES 4/2025",
  "ART. 4 LEY 24240",
  "ART. 4, 7, 8 BIS LEY 24240",
  "LEY 24240"
];

export interface NotificationRecord {
  id: number;
  fechaIngreso: string;
  ref: string;
  anio: number;
  area: Area | string;
  departamento: string;
  tipo: NotifType | string;
  dirigidoA: string; // Company
  contra: string;
  fechaAudiencia?: string;
  notificador: string;
  notificado?: string;
}

export interface InfractionRecord {
  id: number;
  numeroDigital: string;
  fechaIngreso: string;
  ref: string; // Used as N° de Acta
  fechaActa?: string; // New field
  inspector1: string;
  inspector2: string;
  localidad: string;
  razonSocial: string;
  fantasia: string;
  cuil: string;
  leyes: string[];
  vencido: number;
  decomiso: number;
  diasDescargo: number;
  fechaLimiteDescargo: string;
  estado: string;
  presentoDescargo: boolean;
  fechaDescargo?: string;
}

export interface InspectionRecord {
  id: number;
  fecha: string;
  ref: string;
  inspector1: string;
  inspector2: string;
  localidad: string;
  razonSocial: string;
  fantasia: string;
  cuil: string;
  leyes: string[];
  esActuacionDeOficio?: boolean;
}
