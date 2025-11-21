export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface AttendanceRecord {
  id: string;
  timestamp: number;
  type: AttendanceType;
  coordinates: Coordinates;
  photoUrl: string; // Base64 or URL
  locationName?: string; // Reversed geocoded name (mocked)
  isLate?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  department: string;
  shiftStart: string; // HH:mm
  shiftEnd: string; // HH:mm
  role: 'ADMIN' | 'EMPLOYEE'; // Added role for RBAC
}

export type ViewState = 'HOME' | 'HISTORY' | 'REPORT';