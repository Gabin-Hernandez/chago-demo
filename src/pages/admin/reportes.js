import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useToast } from "../../components/ui/Toast";
import { Button } from "../../components/ui/Button";
import AdvancedDateSelector from "../../components/dashboard/AdvancedDateSelector";
import { reportService } from "../../lib/services/reportService";
import { dashboardService } from "../../lib/services/dashboardService";
import { generalService } from "../../lib/services/generalService";
import { conceptService } from "../../lib/services/conceptService";
import { subconceptService } from "../../lib/services/subconceptService";
import { transactionService } from "../../lib/services/transactionService";
import { providerService } from "../../lib/services/providerService";
import useReportStore from "../../lib/stores/reportStore";
import {
  CalendarIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const Reportes = () => {
  const { success, error } = useToast();
  const { showIncomeInBreakdown, toggleShowIncomeInBreakdown } = useReportStore();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [generals, setGenerals] = useState([]);
  const [showCarryoverPanel, setShowCarryoverPanel] = useState(false);
  const [carryoverTransactions, setCarryoverTransactions] = useState([]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "",
    generalId: "",
    conceptId: "",
    subconceptId: "",
  });
  const [currentMonthName, setCurrentMonthName] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [concepts, setConcepts] = useState([]);
  const [subconcepts, setSubconcepts] = useState([]);

  useEffect(() => {
    loadReferenceData();
    // Load initial report with current month
    handleDateChange(currentDate);
  }, []);

  const handleDateChange = (newDate) => {
    setCurrentDate(newDate);
    const startOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const endOfMonth = new Date(
      newDate.getFullYear(),
      newDate.getMonth() + 1,
      0
    );

    // Update month name
    updateMonthName(newDate);

    // Update filters
    setFilters((prev) => ({
      ...prev,
      startDate: startOfMonth.toISOString().split("T")[0],
      endDate: endOfMonth.toISOString().split("T")[0],
    }));
  };

  const updateMonthName = (date) => {
    const monthName = date.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
    setCurrentMonthName(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  };

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      generateReport();
    }
  }, [filters]);

  useEffect(() => {
    updateMonthName(currentDate);
  }, [currentDate]);

  const loadReferenceData = async () => {
    try {
      const [generalsData, conceptsData, subconceptsData] = await Promise.all([
        generalService.getAll(),
        conceptService.getAll(),
        subconceptService.getAll(),
      ]);
      setGenerals(generalsData);
      setConcepts(conceptsData);
      setSubconcepts(subconceptsData);
    } catch (err) {
      console.error("Error loading reference data:", err);
      error("Error al cargar datos de referencia");
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);

      const filterData = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate) : null,
        endDate: filters.endDate ? new Date(filters.endDate) : null,
        conceptId: filters.conceptId || null,
        subconceptId: filters.subconceptId || null,
      };

      const transactionsData =
        await reportService.getFilteredTransactions(filterData);
      const statsData = await reportService.generateReportStats(
        transactionsData,
        filterData
      );

      setTransactions(transactionsData);
      setStats(statsData);

      success("Reporte generado exitosamente");
    } catch (err) {
      console.error("Error generating report:", err);
      error("Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const loadCarryoverTransactions = async () => {
    try {
      if (!filters.startDate) return;

      // Get all pending transactions from before the start date
      const allTransactions = await transactionService.getAll({
        type: 'salida',
        status: 'pendiente'
      });

      // Filter pending transactions that are from before the selected period
      const pendingFromPrevious = allTransactions.filter(transaction => {
        const transactionDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
        const startDate = new Date(filters.startDate);
        
        return transactionDate < startDate && transaction.status === 'pendiente';
      });

      // Get reference data for display
      const [conceptsData, providersData, generalsData] = await Promise.all([
        conceptService.getAll(),
        providerService.getAll(),
        generalService.getAll()
      ]);

      // Enrich transactions with reference data
      const enrichedTransactions = pendingFromPrevious.map(transaction => ({
        ...transaction,
        conceptName: conceptsData.find(c => c.id === transaction.conceptId)?.name || 'Sin concepto',
        providerName: providersData.find(p => p.id === transaction.providerId)?.name || 'Sin proveedor',
        generalName: generalsData.find(g => g.id === transaction.generalId)?.name || 'Sin categoría'
      }));

      setCarryoverTransactions(enrichedTransactions);
      setShowCarryoverPanel(true);
    } catch (err) {
      console.error("Error loading carryover transactions:", err);
      error("Error al cargar transacciones de arrastre");
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [field]: value };

      // If changing concept, clear subconcept if it doesn't belong to the new concept
      if (field === "conceptId") {
        if (value && prev.subconceptId) {
          const selectedSubconcept = subconcepts.find(
            (sc) => sc.id === prev.subconceptId
          );
          if (selectedSubconcept && selectedSubconcept.conceptId !== value) {
            newFilters.subconceptId = "";
          }
        }
      }

      return newFilters;
    });
  };

  const getFilteredSubconcepts = () => {
    if (!filters.conceptId) {
      return subconcepts;
    }
    return subconcepts.filter(
      (subconcept) => subconcept.conceptId === filters.conceptId
    );
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      const filename = await reportService.exportToExcel(
        transactions,
        stats,
        filters
      );
      success(`Reporte exportado a Excel: ${filename}`);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      error("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExporting(true);
      const filename = await reportService.exportToPDF(
        transactions,
        stats,
        filters
      );
      success(`Reporte exportado a PDF: ${filename}`);
    } catch (err) {
      console.error("Error exporting to PDF:", err);
      error("Error al exportar a PDF");
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatPercentage = (amount, total) => {
    if (total === 0) return "0%";
    const percentage = (amount / total) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <AdminLayout
      title="Reportes"
      breadcrumbs={[
        { name: "Dashboard", href: "/admin/dashboard" },
        { name: "Reportes" },
      ]}
    >
      <div className="space-y-6">
        {/* Filters Section */}
        <div className="bg-background rounded-lg border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Filtros de Reporte
            </h2>
            <AdvancedDateSelector
              currentDate={currentDate}
              onDateChange={handleDateChange}
              onSuccess={success}
              onError={error}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="entrada">Ingreso</option>
                <option value="salida">Gasto</option>
              </select>
            </div>

            {/* General Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                General
              </label>
              <select
                value={filters.generalId}
                onChange={(e) =>
                  handleFilterChange("generalId", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                {generals.map((general) => (
                  <option key={general.id} value={general.id}>
                    {general.name} ({general.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Concept Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Concepto
              </label>
              <select
                value={filters.conceptId}
                onChange={(e) =>
                  handleFilterChange("conceptId", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                {concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subconcept Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sub-concepto
              </label>
              <select
                value={filters.subconceptId}
                onChange={(e) =>
                  handleFilterChange("subconceptId", e.target.value)
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Todos</option>
                {getFilteredSubconcepts().map((subconcept) => (
                  <option key={subconcept.id} value={subconcept.id}>
                    {subconcept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={generateReport}
                disabled={loading}
                variant="primary"
                size="md"
                className="inline-flex items-center"
              >
                {loading ? "Generando..." : "Generar Reporte"}
              </Button>
              
              {/* Switch para mostrar/ocultar ingresos */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-foreground">
                  Incluir Ingresos en Desgloses
                </label>
                <button
                  type="button"
                  onClick={toggleShowIncomeInBreakdown}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showIncomeInBreakdown ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showIncomeInBreakdown ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={exportToExcel}
                disabled={!stats || exporting}
                variant="outline"
                size="sm"
                className="inline-flex items-center border-green-500 text-green-600 hover:bg-green-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "Excel"}
              </Button>
              <Button
                onClick={exportToPDF}
                disabled={!stats || exporting}
                variant="outline"
                size="sm"
                className="inline-flex items-center border-red-500 text-red-600 hover:bg-red-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        {stats && (
          <div className="space-y-6">
            {/* Current Period Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-background rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Total Ingreso
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.totalEntradas)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.entradasCount} transacciones
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-background rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Total Gasto
                    </h3>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(stats.totalSalidas)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.salidasCount} transacciones
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-background rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Balance Total
                    </h3>
                    <p
                      className={`text-2xl font-bold ${stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(stats.totalBalance)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Incluye arrastre
                    </p>
                  </div>
                  <ChartBarIcon
                    className={`h-8 w-8 ${stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                  />
                </div>
              </div>

              <div className="bg-background rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Total Transacciones
                    </h3>
                    <p className="text-2xl font-bold text-primary">
                      {stats.totalTransactions}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      En el período
                    </p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Balance Breakdown */}
            {(stats.carryoverBalance !== 0 ||
              stats.currentPeriodBalance !== 0) && (
              <div className="bg-background rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Desglose de Balance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800">
                      Balance del Período
                    </h4>
                    <p
                      className={`text-2xl font-bold ${stats.currentPeriodBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(stats.currentPeriodBalance)}
                    </p>
                    <p className="text-sm text-blue-600">
                      Solo transacciones actuales
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800">
                      Balance Arrastrado
                    </h4>
                    <p
                      className={`text-2xl font-bold ${stats.carryoverBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(stats.carryoverBalance)}
                    </p>
                    <p className="text-sm text-orange-600">
                      Pendientes anteriores
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800">Balance Total</h4>
                    <p
                      className={`text-2xl font-bold ${stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(stats.totalBalance)}
                    </p>
                    <p className="text-sm text-gray-600">Período + Arrastre</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Status (for salidas) */}
        {stats && stats.salidasCount > 0 && (
          <div className="bg-background rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Estado de Gastos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-green-800">Pagados</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-green-700 hover:bg-green-100 -mt-1 -mr-1"
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Estás seguro de reiniciar el contador de pagados? Esto no afectará los datos históricos."
                        )
                      ) {
                        setStats((prev) => ({
                          ...prev,
                          paymentStatus: {
                            ...prev.paymentStatus,
                            pagado: { count: 0, amount: 0, carryover: 0 },
                          },
                        }));
                        success("Contador de pagados reiniciado");
                      }
                    }}
                  >
                    Reiniciar
                  </Button>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.paymentStatus.pagado.count}
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-green-600">
                    Período: {formatCurrency(stats.paymentStatus.pagado.amount)}
                  </p>
                  {stats.paymentStatus.pagado.carryover > 0 && (
                    <p className="text-xs text-green-500">
                      Arrastre:{" "}
                      {formatCurrency(stats.paymentStatus.pagado.carryover)}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800">Parciales</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.paymentStatus.parcial.count}
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-yellow-600">
                    Período:{" "}
                    {formatCurrency(stats.paymentStatus.parcial.amount)}
                  </p>
                  {stats.paymentStatus.parcial.carryover > 0 && (
                    <p className="text-xs text-yellow-500">
                      Arrastre:{" "}
                      {formatCurrency(stats.paymentStatus.parcial.carryover)}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-red-800">Pendientes</h4>
                  {stats.paymentStatus.pendiente.carryover > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-700 hover:bg-red-100 -mt-1 -mr-1"
                      onClick={loadCarryoverTransactions}
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      Ver arrastre
                    </Button>
                  )}
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {stats.paymentStatus.pendiente.count}
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-red-600">
                    Período:{" "}
                    {formatCurrency(stats.paymentStatus.pendiente.amount)}
                  </p>
                  {stats.paymentStatus.pendiente.carryover > 0 && (
                    <p className="text-xs text-red-500">
                      Arrastre:{" "}
                      {formatCurrency(stats.paymentStatus.pendiente.carryover)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* General Breakdown */}
        {stats && Object.keys(stats.generalBreakdown).length > 0 && 
         Object.entries(stats.generalBreakdown).some(([general, data]) => showIncomeInBreakdown || data.salidas > 0) && (
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Desglose por Categoría General
              </h3>
              <p className="text-sm text-muted-foreground italic">
                Solo período: {currentMonthName}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Categoría General
                    </th>
                    {showIncomeInBreakdown && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ingreso
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Solicitudes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      % de Gastos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {Object.entries(stats.generalBreakdown)
                    .filter(([general, data]) => showIncomeInBreakdown || data.salidas > 0)
                    .map(([general, data]) => (
                      <tr key={general}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {general}
                        </td>
                        {showIncomeInBreakdown && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {formatCurrency(data.entradas)}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(data.salidas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(showIncomeInBreakdown ? data.total : data.salidas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {formatPercentage(data.salidas, stats.totalSalidas)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Concept Breakdown */}
        {stats && Object.keys(stats.conceptBreakdown).length > 0 && 
         Object.entries(stats.conceptBreakdown).some(([concept, data]) => showIncomeInBreakdown || data.salidas > 0) && (
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Desglose por Concepto
              </h3>
              <p className="text-sm text-muted-foreground italic">
                Solo período: {currentMonthName}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Concepto
                    </th>
                    {showIncomeInBreakdown && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ingreso
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Solicitudes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      % de Gastos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {Object.entries(stats.conceptBreakdown)
                    .filter(([concept, data]) => showIncomeInBreakdown || data.salidas > 0)
                    .map(([concept, data]) => (
                      <tr key={concept}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {concept}
                        </td>
                        {showIncomeInBreakdown && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            {formatCurrency(data.entradas)}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(data.salidas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {formatCurrency(showIncomeInBreakdown ? data.total : data.salidas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {formatPercentage(data.salidas, stats.totalSalidas)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Provider Breakdown (for salidas) */}
        {stats && Object.keys(stats.providerBreakdown).length > 0 && (
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Desglose por Proveedor (Gastos)
              </h3>
              <p className="text-sm text-muted-foreground italic">
                Solo período: {currentMonthName}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Monto Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Saldo Pendiente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Transacciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      % de Gastos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {Object.entries(stats.providerBreakdown).map(
                    ([provider, data]) => (
                      <tr key={provider}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {provider}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {formatCurrency(data.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(data.pendingAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {data.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {formatPercentage(data.amount, stats.totalSalidas)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">
                Generando reporte...
              </span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && stats && stats.totalTransactions === 0 && (
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="border-2 border-dashed border-border rounded-lg h-32 flex items-center justify-center">
              <div className="text-center">
                <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No se encontraron transacciones con los filtros seleccionados
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Carryover Transactions Side Panel */}
      {showCarryoverPanel && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowCarryoverPanel(false)} />
          <div className="absolute right-0 top-0 h-full w-96 max-w-full bg-background shadow-xl">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Gastos Pendientes de Arrastre
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCarryoverPanel(false)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Gastos pendientes de períodos anteriores a {currentMonthName}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {carryoverTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No hay gastos pendientes de períodos anteriores
                  </p>
                ) : (
                  <div className="space-y-4">
                    {carryoverTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="border border-border rounded-lg p-4 bg-red-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground">
                            {transaction.conceptName}
                          </h4>
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><strong>Proveedor:</strong> {transaction.providerName}</p>
                          <p><strong>Categoría:</strong> {transaction.generalName}</p>
                          <p><strong>Fecha:</strong> {
                            transaction.date?.toDate ? 
                            transaction.date.toDate().toLocaleDateString('es-ES') :
                            new Date(transaction.date).toLocaleDateString('es-ES')
                          }</p>
                          {transaction.description && (
                            <p><strong>Descripción:</strong> {transaction.description}</p>
                          )}
                          <p><strong>Saldo pendiente:</strong> {formatCurrency(transaction.balance || transaction.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {carryoverTransactions.length > 0 && (
                <div className="px-6 py-4 border-t border-border bg-muted">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total de {carryoverTransactions.length} transacciones
                    </span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(
                        carryoverTransactions.reduce((sum, t) => sum + (t.balance || t.amount), 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Reportes;
