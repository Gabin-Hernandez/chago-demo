# Sistema de Gastos Recurrentes con Múltiples Frecuencias

## Descripción General

El sistema de gastos recurrentes ha sido completamente renovado para soportar múltiples frecuencias de generación automática. Ahora es posible crear gastos que se ejecuten diariamente, semanalmente, quincenalmente o mensualmente utilizando un cron job diario en Vercel.

## Cambios Principales

### 1. Nuevo Formulario Dedicado
- **Antes**: Los gastos recurrentes se creaban desde el formulario de salidas con un toggle
- **Ahora**: Formulario dedicado en `/admin/transacciones/recurrentes/nuevo`
- **Beneficios**: 
  - Interfaz específica para configurar frecuencias
  - Mejor UX con explicaciones claras
  - Validaciones específicas para gastos recurrentes

### 2. Múltiples Frecuencias Soportadas

| Frecuencia | Descripción | Cuándo se ejecuta |
|------------|-------------|-------------------|
| **Diario** | Genera una transacción todos los días | Todos los días a las 00:00 GMT |
| **Semanal** | Genera una transacción semanal | Todos los lunes a las 00:00 GMT |
| **Quincenal** | Genera transacciones dos veces al mes | Día 15 y último día del mes a las 00:00 GMT |
| **Mensual** | Genera una transacción mensual | Primer día del mes a las 00:00 GMT |

### 3. Cron Job Diario
- **Antes**: Se ejecutaba solo el primer día del mes (`0 0 1 * *`)
- **Ahora**: Se ejecuta diariamente (`0 0 * * *`)
- **Ventajas**:
  - Soporta todas las frecuencias
  - Mayor confiabilidad
  - Verificación diaria automática

### 4. Nuevos Campos en Base de Datos

#### Estructura actualizada de `recurringExpenses`:
```javascript
{
  // Campos existentes
  generalId: string,
  conceptId: string,
  subconceptId: string,
  description: string,
  amount: number,
  providerId: string,
  division: string,
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  lastGenerated: timestamp,
  
  // Nuevos campos
  frequency: string, // 'daily' | 'weekly' | 'biweekly' | 'monthly'
  startDate: timestamp, // Fecha desde cuándo empezar a generar
  generatedDates: string[], // Array de fechas específicas generadas (YYYY-MM-DD)
  
  // Campo para retrocompatibilidad
  generatedMonths: string[] // Array de meses generados (YYYY-MM)
}
```

## Implementación Técnica

### 1. Componentes Nuevos

#### `RecurringExpenseForm.js`
- Formulario dedicado para crear gastos recurrentes
- Selector de frecuencia con explicaciones
- Fecha de inicio configurable
- Validaciones específicas

#### Página `/admin/transacciones/recurrentes/nuevo.js`
- Página envolvente del formulario
- Información educativa sobre frecuencias
- Navegación integrada

### 2. Servicio Actualizado

#### `recurringExpenseService.js` - Métodos principales:

```javascript
// Generación diaria inteligente
async generatePendingTransactions(user) {
  // Revisa TODOS los gastos recurrentes activos
  // Determina si debe generar según la fecha actual y frecuencia
  // Evita duplicados usando generatedDates
}

// Determinación de generación
shouldGenerateForDate(currentDate, frequency, generatedDates, startDate) {
  // daily: Siempre (si no existe ya)
  // weekly: Solo lunes
  // biweekly: Solo día 15 y último día del mes
  // monthly: Solo día 1 del mes
}

// Migración automática
async migrateExistingExpenses() {
  // Añade campos nuevos a gastos recurrentes existentes
  // Los marca como 'monthly' por retrocompatibilidad
}
```

### 3. Cron Job Actualizado

#### `/api/cron/generate-recurring.js`
```javascript
// Se ejecuta diariamente
// Llama a generatePendingTransactions()
// Registra métricas detalladas:
// - Día de ejecución
// - Día de la semana
// - Si es último día del mes
// - Transacciones generadas
```

#### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-recurring",
      "schedule": "0 0 * * *"  // Diario a medianoche GMT
    }
  ]
}
```

## Retrocompatibilidad

### Migración Automática
- Los gastos recurrentes existentes se migran automáticamente
- Se configuran como frecuencia 'monthly' por defecto
- Mantienen su comportamiento original

### Campos Legacy
- `generatedMonths` se mantiene para gastos mensuales
- `lastGenerated` sigue funcionando como antes
- Las transacciones existentes no se ven afectadas

## Flujo de Usuario

### Creación de Gasto Recurrente
1. Navegar a "Gastos Recurrentes"
2. Hacer clic en "Nuevo Gasto Recurrente"
3. Completar formulario con frecuencia deseada
4. Configurar fecha de inicio
5. Guardar - El sistema empezará a generar automáticamente

### Gestión de Gastos Recurrentes
1. Ver lista con frecuencias claramente marcadas
2. Activar/desactivar según necesidad
3. Ver detalles específicos de generación
4. Eliminar si ya no se necesitan

## Ventajas del Nuevo Sistema

### 1. Flexibilidad
- Soporta cualquier frecuencia de negocio
- Configuración granular por gasto
- Fechas de inicio personalizables

### 2. Confiabilidad
- Cron job diario reduce fallos
- Sistema de verificación robusto
- Prevención de duplicados mejorada

### 3. Escalabilidad
- Arquitectura preparada para nuevas frecuencias
- Base de datos optimizada
- Logging y monitoreo completo

### 4. Experiencia de Usuario
- Formulario intuitivo y educativo
- Visualización clara de frecuencias
- Navegación lógica y consistente

## Casos de Uso

### Gastos Diarios
- Comidas para empleados
- Transporte diario
- Servicios básicos variables

### Gastos Semanales
- Limpieza semanal
- Reuniones semanales
- Servicios semanales

### Gastos Quincenales
- Nóminas quincenales
- Pagos a proveedores específicos
- Servicios quincenales

### Gastos Mensuales
- Rentas
- Servicios públicos
- Seguros y suscripciones

## Monitoreo y Debugging

### Logs del Cron Job
- Día de ejecución y contexto
- Gastos evaluados vs generados
- Errores específicos por gasto
- Métricas de rendimiento

### Interfaz de Usuario
- Estado visual de cada gasto
- Historial de generaciones
- Fechas de próxima ejecución esperada

## Futuras Mejoras

1. **Frecuencias adicionales**: Trimestral, semestral, anual
2. **Días específicos**: Configurar día exacto del mes
3. **Excepciones**: Saltarse días festivos o específicos
4. **Notificaciones**: Email cuando se generan gastos
5. **Plantillas**: Plantillas predefinidas por tipo de negocio
6. **Analytics**: Dashboard de gastos recurrentes generados

## Archivos Modificados

### Nuevos
- `src/components/forms/RecurringExpenseForm.js`
- `src/pages/admin/transacciones/recurrentes/nuevo.js`
- `RECURRING_EXPENSES_MULTIPLE_FREQUENCIES.md` (este archivo)

### Modificados
- `src/lib/services/recurringExpenseService.js`
- `src/pages/api/cron/generate-recurring.js`
- `vercel.json`
- `src/components/forms/TransactionForm.js` (removido toggle)
- `src/pages/admin/transacciones/recurrentes.js` (actualizada UI)

### Estructura de Base de Datos
- `recurringExpenses` collection (nuevos campos)
- Migración automática incluida
- Compatibilidad total con datos existentes
