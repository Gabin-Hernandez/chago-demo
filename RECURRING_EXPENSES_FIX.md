# Fix para Gastos Recurrentes - Prevención de Duplicados

## Problema Identificado

Los gastos recurrentes se estaban generando múltiples veces para el mismo mes cada vez que se accedía al dashboard, causando duplicación infinita de transacciones. Además, se estaban generando por adelantado para el mes siguiente en lugar de esperar a que llegue el mes correspondiente.

## Solución Implementada

### 1. Generación Solo para el Mes Actual

**Cambio principal:** Los gastos recurrentes ahora solo se generan para el mes actual cuando un usuario accede al sistema en ese mes, no por adelantado.

- **Antes:** En agosto se generaban los gastos de septiembre
- **Ahora:** En agosto se generan los gastos de agosto (si no se han generado ya)
- **En septiembre:** Se generarán los gastos de septiembre cuando alguien acceda en septiembre

### 2. Nuevo Campo `generatedMonths`

Se agregó un nuevo campo `generatedMonths` a cada gasto recurrente que mantiene un array de los meses para los cuales ya se han generado transacciones.

**Formato del array:**
```javascript
generatedMonths: ["2024-08", "2024-09", "2024-10"] // Formato: YYYY-MM
```

### 2. Cambios en el Servicio

**Archivo modificado:** `src/lib/services/recurringExpenseService.js`

- **Método `create`**: Inicializa el campo `generatedMonths` como array vacío
- **Método `generatePendingTransactions`**: 
  - **CAMBIO PRINCIPAL:** Genera transacciones para el mes actual, no el próximo
  - Verifica si el mes actual ya existe en `generatedMonths` antes de generar
  - Agrega el mes al array después de generar exitosamente
  - Incluye logs para mejor debugging
- **Método `cleanFutureTransactions`**: 
  - Elimina meses del array `generatedMonths` cuando se borran transacciones futuras
- **Nuevo método `migrateExistingExpenses`**: 
  - Migra gastos recurrentes existentes para agregar el campo `generatedMonths`

### 3. Cambios en el Hook

**Archivo modificado:** `src/lib/hooks/useRecurringExpenses.js`

- Actualizado `checkPendingGeneration` para usar `generatedMonths` en lugar de `lastGenerated`
- **CAMBIO:** Ahora verifica gastos pendientes para el mes actual, no el próximo

### 4. Migración Automática

Se implementó migración automática que se ejecuta en:
- Dashboard al cargar (`src/pages/admin/dashboard.js`)
- Componente de alerta (`src/components/dashboard/RecurringExpenseAlert.js`)
- API endpoints (`src/pages/api/recurring-expenses/generate.js`)
- Cron job (`src/pages/api/cron/generate-recurring.js`)

### 5. Script de Migración Manual

**Archivo creado:** `scripts/migrate-recurring-expenses.js`
- Script Node.js para migrar manualmente todos los gastos recurrentes existentes
- Requiere configuración de Firebase Admin SDK

**Endpoint de migración:** `/api/recurring-expenses/migrate`
- Endpoint HTTP para ejecutar la migración vía API

## Cómo Funciona Ahora

1. **Al crear un gasto recurrente**: Se inicializa `generatedMonths` como array vacío
2. **Al generar transacciones (solo cuando llegue el mes)**:
   - Se calcula el mes actual (formato YYYY-MM)
   - Se verifica si el mes actual está en `generatedMonths`
   - Si NO está, se genera la transacción y se agrega el mes al array
   - Si SÍ está, se omite la generación
3. **Al limpiar transacciones futuras**: Se remueven los meses correspondientes del array

### Ejemplo de Funcionamiento:

- **Agosto 2024**: Usuario entra → se generan gastos de agosto (si no existen)
- **Agosto 2024**: Usuario entra otra vez → no se generan gastos (ya existen para agosto)
- **Septiembre 2024**: Usuario entra → se generan gastos de septiembre (primer acceso del mes)
- **Septiembre 2024**: Usuario entra otra vez → no se generan gastos (ya existen para septiembre)

## Retrocompatibilidad

- Los gastos recurrentes existentes sin `generatedMonths` son migrados automáticamente
- Si existe `lastGenerated`, se usa para inferir el último mes generado
- La migración se ejecuta automáticamente al acceder al dashboard

## Logs y Debugging

Se agregaron logs detallados para:
- Seguimiento de transacciones generadas
- Identificación de gastos omitidos por duplicación
- Proceso de migración
- Limpieza de transacciones futuras

## Prevención de Problemas Futuros

- **Unicidad garantizada**: Un mes no puede aparecer dos veces en `generatedMonths`
- **Rastreo completo**: Se mantiene historial de todos los meses generados
- **Limpieza automática**: Al eliminar transacciones se actualiza el array
- **Validación robusta**: Múltiples verificaciones antes de generar

## Testeo

Para probar que funciona correctamente:

1. Acceder al dashboard múltiples veces
2. Verificar que no se generen transacciones duplicadas
3. Revisar los logs en la consola del navegador
4. Comprobar que `generatedMonths` se actualiza correctamente

## Comandos para Migración Manual

```bash
# Ejecutar script de migración (requiere configuración Firebase Admin)
node scripts/migrate-recurring-expenses.js

# O usar el endpoint API
curl -X POST http://localhost:3000/api/recurring-expenses/migrate \
  -H "Authorization: Bearer your-token"
```

## Consideraciones Técnicas

- **Performance**: El array `generatedMonths` es pequeño (máximo 12 elementos por año)
- **Storage**: Impacto mínimo en el tamaño de documentos
- **Consultas**: No afecta significativamente las consultas existentes
- **Escalabilidad**: Solución escalable para grandes volúmenes de gastos recurrentes

## Archivos Modificados

- ✅ `src/lib/services/recurringExpenseService.js`
- ✅ `src/lib/hooks/useRecurringExpenses.js`
- ✅ `src/pages/admin/dashboard.js`
- ✅ `src/components/dashboard/RecurringExpenseAlert.js`
- ✅ `src/pages/api/recurring-expenses/generate.js`
- ✅ `src/pages/api/cron/generate-recurring.js`
- ✅ `scripts/migrate-recurring-expenses.js` (nuevo)
- ✅ `src/pages/api/recurring-expenses/migrate.js` (nuevo)
