export interface Worker {
  id: string;
  name: string;
  documentId: string;
  phone?: string;
  active: boolean;
}

export interface CompanyVehicle {
  id: string;
  name: string;
  plate: string;
  type: 'camion' | 'furgon' | 'moto' | 'auto' | 'otros';
  active: boolean;
  inUse?: boolean;
}

export interface LogEntry {
  id: string;
  workerId: string;
  workerName: string;
  entryTime: string;
  exitTime?: string;
  personalVehicleType: 'moto' | 'auto' | 'ninguno';
  personalVehiclePlate?: string;
  companyVehicleId?: string; // ID of company vehicle taken out
  companyVehicleName?: string;
  companyVehiclePlate?: string;
  status: 'adentro' | 'salido';
  entryGuard?: string;
  exitGuard?: string;
  entryObservations?: string;
  exitObservations?: string;
}

export interface User {
  username: string;
  role: 'guardia' | 'administrador';
  displayName: string;
}

