// Application constants
export const TRANSACTION_TYPES = {
  ENTRADA: 'entrada',
  SALIDA: 'salida'
};

export const PAYMENT_STATUS = {
  PENDIENTE: 'pendiente',
  PARCIAL: 'parcial',
  PAGADO: 'pagado'
};

export const FILE_TYPES = {
  ACCEPTED: ['image/jpeg', 'image/png', 'application/pdf'],
  MAX_SIZE: 5 * 1024 * 1024 // 5MB
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/admin/dashboard',
  ENTRADAS: '/admin/entradas',
  SALIDAS: '/admin/salidas',
  HISTORIAL: '/admin/historial',
  PROVEEDORES: '/admin/proveedores',
  CONCEPTOS: '/admin/conceptos',
  REPORTES: '/admin/reportes'
};

// Color scheme for different transaction types
export const TRANSACTION_COLORS = {
  // Regular gastos (salidas) - Standard red
  GASTOS: {
    primary: '#EF4444', // red-500
    background: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200'
  },
  // Gastos recurrentes - Light red variants
  GASTOS_RECURRENTES: {
    primary: '#FB7185', // rose-400 (lighter)
    background: 'bg-rose-50',
    text: 'text-rose-400',
    border: 'border-rose-200',
    gradient: 'from-rose-50 to-pink-50'
  },
  // Ingresos (entradas) - Green
  INGRESOS: {
    primary: '#10B981', // emerald-500
    background: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200'
  }
};