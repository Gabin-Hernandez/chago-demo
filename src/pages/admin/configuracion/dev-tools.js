import { useState } from "react";
import AdminLayout from "../../../components/layout/AdminLayout";
import DeleteTransactionsModal from "../../../components/admin/DeleteTransactionsModal";
import { transactionService } from "../../../lib/services/transactionService";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/ui/Toast";

const DevTools = () => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <AdminLayout
        title="Herramientas de Desarrollo"
        breadcrumbs={[
          { name: "Dashboard", href: "/admin/dashboard" },
          { name: "Configuración" },
          { name: "Herramientas de Desarrollo" },
        ]}
      >
        <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-3xl">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No disponible en producción
            </h2>
            <p className="text-gray-600">
              Las herramientas de desarrollo solo están disponibles en el entorno de desarrollo.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const handleDeleteTransactions = async (year, month, onProgress) => {
    try {
      // Call the service directly with progress callback
      const result = await transactionService.deleteTransactionsByMonth(
        year, 
        month, 
        user, 
        onProgress
      );
      
      if (result.errors.length > 0) {
        toast.warning(`Se eliminaron ${result.deletedCount} de ${result.totalFound} transacciones. ${result.errors.length} errores.`);
      } else {
        toast.success(`Se eliminaron ${result.deletedCount} transacciones exitosamente.`);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AdminLayout
      title="Herramientas de Desarrollo"
      breadcrumbs={[
        { name: "Dashboard", href: "/admin/dashboard" },
        { name: "Configuración" },
        { name: "Herramientas de Desarrollo" },
      ]}
    >
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            🛠️ Herramientas de Desarrollo
          </h2>
          <p className="text-gray-600 mt-1">
            Herramientas útiles para desarrollo y testing. Solo disponibles en entorno de desarrollo.
          </p>
        </div>

        {/* Environment indicator */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-yellow-800">Entorno de Desarrollo</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Estas herramientas están diseñadas para facilitar el desarrollo y testing. 
                <strong> No están disponibles en producción.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Delete Transactions Tool */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="text-3xl">🗑️</div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Eliminar Transacciones por Mes
                </h3>
                <p className="text-gray-600 mt-1 mb-4">
                  Elimina todas las transacciones de un mes específico. Útil para limpiar datos de prueba
                  o resetear un mes durante el desarrollo.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-sm text-red-800">
                        <strong>Acción irreversible:</strong> Las transacciones eliminadas no se pueden recuperar.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  🗑️ Eliminar Transacciones
                </button>
              </div>
            </div>
          </div>

          {/* Placeholder for future tools */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="text-3xl">🔧</div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Más Herramientas
                </h3>
                <p className="text-gray-600 mt-1">
                  Aquí se pueden agregar más herramientas de desarrollo en el futuro.
                </p>
                
                <div className="mt-4 text-sm text-gray-500">
                  Ideas para futuras herramientas:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Reset de gastos recurrentes</li>
                    <li>Generar datos de prueba</li>
                    <li>Exportar/Importar configuración</li>
                    <li>Limpiar logs antiguos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Transactions Modal */}
      <DeleteTransactionsModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTransactions}
      />
    </AdminLayout>
  );
};

export default DevTools;
