import React, { useState } from "react";
import Sidebar from "../../components/layouts/sidebar"; // Adjust path based on your structure
import Header from "../../components/layouts/header"; // Adjust path based on your structure

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-white lg:rounded-l-[1.5rem] lg:shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-gray-100">
        {/* Header Component */}
        <Header setSidebarOpen={setSidebarOpen} />

        {/* Scrollable Content Wrapper */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
