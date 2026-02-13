import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import { DashboardPage } from './pages/Dashboard';
import AddProject from './pages/admin/AddProject';
import EditProject from './pages/admin/EditProject';
import DeleteProject from './pages/admin/DeleteProject';
import AddUser from './pages/admin/AddUser';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 3000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/add-project"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <AddProject />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-project"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <EditProject />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/delete-project"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <DeleteProject />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/add-user"
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <AddUser />
                </DashboardLayout>
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;



