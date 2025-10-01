import { recurringExpenseService } from "../../../lib/services/recurringExpenseService";

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
      console.log('[CRON] Running without CRON_SECRET - development mode');
    }

    const today = new Date();
    
    // First, run migration for existing expenses that don't have the new fields
    await recurringExpenseService.migrateExistingExpenses();
    
    // Generate pending transactions for today (supports all frequencies)
    const generatedTransactions = await recurringExpenseService.generatePendingTransactions({
      uid: 'system-cron',
      email: 'system@santiago-fc.com'
    });

    // Log the generation for monitoring
    console.log(`[CRON] Generated ${generatedTransactions.length} recurring transactions on ${today.toISOString()}`);

    res.status(200).json({
      success: true,
      message: `Generated ${generatedTransactions.length} recurring transactions`,
      transactions: generatedTransactions,
      date: today.toISOString(),
      executionDay: today.getDate(),
      dayOfWeek: today.getDay(), // 0 = Sunday, 1 = Monday, etc.
      lastDayOfMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() === today.getDate()
    });

  } catch (error) {
    console.error('[CRON] Error generating recurring transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recurring transactions',
      error: error.message
    });
  }
}

// Example cron job setup (add to your deployment platform):
// 
// For Vercel, add to vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/generate-recurring",
//       "schedule": "0 0 1 * *"
//     }
//   ]
// }
//
// For other platforms, set up a cron job to call:
// curl -X POST https://your-domain.com/api/cron/generate-recurring \
//   -H "Authorization: Bearer your-secret-key"