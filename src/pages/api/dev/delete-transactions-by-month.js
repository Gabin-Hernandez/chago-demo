import { transactionService } from "../../../lib/services/transactionService";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      success: false,
      message: 'Esta funcionalidad solo está disponible en desarrollo' 
    });
  }

  try {
    const { year, month, user } = req.body;
    
    // Basic validation
    if (!year || month === undefined || !user) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos: year, month, user'
      });
    }

    // Validate year and month ranges
    if (year < 2020 || year > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Año inválido. Debe estar entre 2020 y 2030'
      });
    }

    if (month < 0 || month > 11) {
      return res.status(400).json({
        success: false,
        message: 'Mes inválido. Debe estar entre 0 y 11'
      });
    }

    console.log(`🗑️ API: Deleting transactions for ${year}-${month.toString().padStart(2, '0')}`);

    // Delete transactions
    const result = await transactionService.deleteTransactionsByMonth(year, month, user);

    console.log(`🗑️ API: Deletion completed. ${result.deletedCount}/${result.totalFound} deleted`);

    res.status(200).json({
      success: true,
      message: `Se eliminaron ${result.deletedCount} de ${result.totalFound} transacciones`,
      data: result
    });

  } catch (error) {
    console.error('❌ API Error deleting transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar transacciones',
      error: error.message
    });
  }
}
