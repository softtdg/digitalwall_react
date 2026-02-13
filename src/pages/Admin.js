import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './admin/Dashboard';
import AddProject from './admin/AddProject';
import EditProject from './admin/EditProject';
import DeleteProject from './admin/DeleteProject';
import AddUser from './admin/AddUser';

const Admin = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'add-project', label: 'Add Project', icon: '➕' },
    { id: 'edit-project', label: 'Edit Project', icon: '✏️' },
    { id: 'delete-project', label: 'Delete Project', icon: '🗑️' },
    { id: 'add-user', label: 'Add User', icon: '👤' },
  ];

  const handleMenuClick = (pageId) => {
    setActivePage(pageId);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-project':
        return <AddProject />;
      case 'edit-project':
        return <EditProject />;
      case 'delete-project':
        return <DeleteProject />;
      case 'add-user':
        return <AddUser />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 w-full">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600 text-sm mt-1">
                Welcome, {userData.uname || 'Admin'}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-md min-h-[calc(100vh-80px)]">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${activePage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Admin;

