import AdminLayout from "../../components/layout/AdminLayout";
import FinancialChatbot from "../../components/dashboard/FinancialChatbotV2";
import RoleProtectedRoute from "../../components/auth/RoleProtectedRoute";

const AnalisisIA = () => {
  return (
    <RoleProtectedRoute allowedRoles={["admin", "viewer"]}>
      <AdminLayout
        title="Chatbot Financiero IA"
        breadcrumbs={[
          { name: "Dashboard", href: "/admin/dashboard" },
          { name: "Chatbot Financiero IA" },
        ]}
      >





        {/* Financial Chatbot Component */}
        <FinancialChatbot />



      </AdminLayout>
    </RoleProtectedRoute>
  );
};

export default AnalisisIA;
