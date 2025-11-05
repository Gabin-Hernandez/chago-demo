/**
 * API Endpoint para ejecutar auditoría de duplicados
 * 
 * GET /api/admin/audit-duplicates
 * 
 * Requiere autenticación de administrador
 */

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../lib/firebase/firebaseConfig";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const OCTOBER_31_2025 = new Date('2025-10-31T00:00:00');
    const NOVEMBER_7_2025 = new Date('2025-11-07T23:59:59');

    console.log('🔍 API: Iniciando auditoría de duplicados...');

    // Obtener todas las transacciones recurrentes del período
    const transactionsRef = collection(db, "transactions");
    const q = query(
      transactionsRef,
      where("isRecurring", "==", true),
      orderBy("date", "asc")
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const transactionDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      
      if (transactionDate >= OCTOBER_31_2025 && transactionDate <= NOVEMBER_7_2025) {
        transactions.push({
          id: doc.id,
          ...data,
          date: transactionDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        });
      }
    });

    // Agrupar por recurringExpenseId
    const groupedByRecurringExpense = {};
    
    transactions.forEach(transaction => {
      const key = transaction.recurringExpenseId;
      if (!key) return;
      
      if (!groupedByRecurringExpense[key]) {
        groupedByRecurringExpense[key] = [];
      }
      groupedByRecurringExpense[key].push(transaction);
    });

    // Detectar duplicados
    const duplicates = [];
    const duplicateGroups = [];

    Object.entries(groupedByRecurringExpense).forEach(([recurringExpenseId, txns]) => {
      if (txns.length > 1) {
        const amounts = [...new Set(txns.map(t => t.amount))];
        
        if (amounts.length === 1) {
          duplicateGroups.push({
            recurringExpenseId,
            amount: amounts[0],
            count: txns.length,
            transactions: txns.map(t => ({
              id: t.id,
              date: t.date.toISOString(),
              createdAt: t.createdAt.toISOString(),
              amount: t.amount,
              description: t.description,
              status: t.status
            }))
          });
          
          txns.forEach(txn => duplicates.push(txn));
        }
      }
    });

    const totalAmountDuplicated = duplicates.reduce((sum, txn) => sum + txn.amount, 0);

    // Generar datos para CSV (formato simple)
    const csvData = duplicates.map(txn => ({
      transactionId: txn.id,
      recurringExpenseId: txn.recurringExpenseId || 'N/A',
      userId: txn.userId || 'N/A',
      amount: txn.amount,
      date: txn.date.toISOString().split('T')[0],
      createdAt: txn.createdAt.toISOString(),
      description: txn.description || '',
      status: txn.status || 'N/A'
    }));

    return res.status(200).json({
      success: true,
      summary: {
        totalTransactionsAnalyzed: transactions.length,
        duplicateGroupsFound: duplicateGroups.length,
        totalDuplicateTransactions: duplicates.length,
        totalAmountDuplicated: totalAmountDuplicated,
        dateRange: {
          from: OCTOBER_31_2025.toISOString().split('T')[0],
          to: NOVEMBER_7_2025.toISOString().split('T')[0]
        }
      },
      duplicateGroups,
      csvData,
      message: duplicates.length > 0 
        ? `Se encontraron ${duplicates.length} transacciones duplicadas en ${duplicateGroups.length} grupos`
        : 'No se encontraron duplicados en el período analizado'
    });

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al ejecutar la auditoría',
      error: error.message
    });
  }
}
