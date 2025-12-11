import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell, FileText, ClipboardList, LayoutDashboard, Menu, X } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const navItems = [
    { name: 'Notificaciones', path: '/', icon: Bell },
    { name: 'Actas de Infracción', path: '/actas', icon: FileText },
    { name: 'Actas de Inspección', path: '/inspecciones', icon: ClipboardList },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-brand-light flex flex-col md:flex-row">
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden bg-brand-dark text-white p-4 flex justify-between items-center shadow-md z-30 sticky top-0">
        <div>
          <h1 className="text-lg font-bold tracking-wide">LEALTAD COMERCIAL</h1>
          <p className="text-xs text-blue-200">Catamarca</p>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-brand-dark text-white shadow-2xl transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:min-h-screen md:shadow-lg flex flex-col flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-blue-800 hidden md:block">
          <h1 className="text-xl font-bold tracking-wide">LEALTAD COMERCIAL</h1>
          <p className="text-xs text-blue-200 mt-1">Catamarca</p>
        </div>
        
        <div className="flex flex-col py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center px-6 py-4 transition-colors duration-200
                  ${isActive ? 'bg-brand-primary text-white shadow-inner border-r-4 border-white' : 'text-blue-100 hover:bg-blue-900'}
                `}
              >
                <Icon size={20} className="mr-3" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
        
        <div className="mt-auto p-6 text-xs text-blue-300">
          <p>Conectado a Google Sheets</p>
          <p className="truncate opacity-50">ID: 1xO0uf...</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-5xl mx-auto pb-24">
          {children}
        </div>
      </main>

      {/* Floating Dashboard Button */}
      <NavLink
        to="/dashboard"
        onClick={closeSidebar}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-brand-dark text-white p-4 rounded-full shadow-xl hover:bg-brand-primary hover:scale-105 transition-all duration-300 z-50 group border-4 border-white"
        title="Dashboard"
      >
        <LayoutDashboard size={28} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ver Dashboard
        </span>
      </NavLink>
    </div>
  );
};