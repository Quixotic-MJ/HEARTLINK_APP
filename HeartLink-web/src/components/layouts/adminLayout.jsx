import React, { useState } from "react";
import Sidebar from "../../components/layouts/sidebar"; // Adjust path based on your structure
import Header from "../../components/layouts/header"; // Adjust path based on your structure

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full bg-gray-50/50 font-sans text-gray-900 overflow-hidden fixed inset-0">
      {/* Sidebar Component */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-white border-l border-gray-100 rounded-none">
        {/* Header Component */}
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
