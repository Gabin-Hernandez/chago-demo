import { carryoverService } from "../../../lib/services/carryoverService";

export default async function handler(req, res) {
  // Vercel cron jobs send GET requests, but we also support POST for manual testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed. Use GET or POST.' });
  }

  try {
    // Verify the request is coming from a trusted source (optional in development)
    const { authorization } = req.headers;
    const cronSecret = process.env.CRON_SECRET;
    
    // Only validate authorization if CRON_SECRET is set
    if (cronSecret && (!authorization || authorization !== `Bearer ${cronSecret}`)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Log if running without security (for development)
    if (!cronSecret) {
      console.log('[CRON] Running carryover calculation without CRON_SECRET - development mode');
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    console.log(`[CRON] Starting carryover calculation for ${currentMonth}/${currentYear} on ${today.toISOString()}`);

    // Verificar si ya existe el cálculo del arrastre para este mes
    const existingCarryover = await carryoverService.getCarryoverForMonth(currentYear, currentMonth);
    
    if (existingCarryover) {
      console.log(`[CRON] Carryover already calculated for ${currentMonth}/${currentYear}:`, existingCarryover.saldoArrastre);
      
      return res.status(200).json({
        success: true,
        message: `Carryover already calculated for ${currentMonth}/${currentYear}${existingCarryover.saldoArrastre > 0 ? ` (${existingCarryover.saldoArrastre.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })})` : ' (no balance to carry)'}`,
        carryoverData: existingCarryover,
        alreadyExists: true,
        date: today.toISOString()
      });
    }

    // Calcular el arrastre del mes anterior al actual
    const carryoverData = await carryoverService.calculateAndSaveCarryover(currentYear, currentMonth);

    // Log the calculation for monitoring
    console.log(`[CRON] Calculated carryover for ${currentMonth}/${currentYear}:`, {
      saldoArrastre: carryoverData.saldoArrastre,
      previousMonth: carryoverData.previousMonth,
      previousYear: carryoverData.previousYear,
      totalIngresos: carryoverData.totalIngresos,
      totalGastosPagados: carryoverData.totalGastosPagados
    });

    res.status(200).json({
      success: true,
      message: carryoverData.saldoArrastre > 0 
        ? `Carryover calculated for ${currentMonth}/${currentYear}: ${carryoverData.saldoArrastre.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`
        : `Carryover calculated for ${currentMonth}/${currentYear}: No positive balance to carry over`,
      carryoverData: carryoverData,
      calculated: true,
      date: today.toISOString(),
      summary: {
        month: currentMonth,
        year: currentYear,
        carryoverAmount: carryoverData.saldoArrastre,
        fromMonth: carryoverData.previousMonth,
        fromYear: carryoverData.previousYear,
        totalIncome: carryoverData.totalIngresos,
        totalPaidExpenses: carryoverData.totalGastosPagados
      }
    });

  } catch (error) {
    console.error('[CRON] Error calculating carryover:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating carryover',
      error: error.message,
      date: new Date().toISOString()
    });
  }
}

// Example cron job setup:
// 
// For Vercel, add to vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/calculate-carryover",
//       "schedule": "0 0 1 * *"
//     }
//   ]
// }
//
// For other platforms, set up a cron job to call:
// curl -X POST https://your-domain.com/api/cron/calculate-carryover \
//   -H "Authorization: Bearer your-secret-key"
//
// Schedule: "0 0 1 * *" means:
// - minute: 0 (at the top of the hour)
// - hour: 0 (midnight)
// - day: 1 (first day of the month)
// - month: * (every month)
// - day of week: * (any day of the week)
