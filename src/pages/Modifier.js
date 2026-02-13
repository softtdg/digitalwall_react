import React from 'react';
import { useNavigate } from 'react-router-dom';

const Modifier = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Modifier Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome, {userData.uname || 'Modifier'}!
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Modifier Content</h2>
          <p className="text-gray-600">
            This is the modifier page. Only users with the "modifier" role can access this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Modifier;

