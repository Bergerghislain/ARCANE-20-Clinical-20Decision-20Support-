import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientFile from "./pages/PatientFile";
import AddPatient from "./pages/AddPatient";
import ArgosSpace from "./pages/ArgosSpace";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import AdminUsers from "./pages/AdminUsers";
import ForgotPassword from "./pages/ForgotPassword";
import { isAuthenticated, getStoredUser } from "./lib/auth";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: React.ReactElement }) {
  const user = getStoredUser();
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminUsers />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/patient/:patientId"
        element={
          <RequireAuth>
            <PatientFile />
          </RequireAuth>
        }
      />
      <Route
        path="/add-patient"
        element={
          <RequireAuth>
            <AddPatient />
          </RequireAuth>
        }
      />
      <Route
        path="/argos"
        element={
          <RequireAuth>
            <ArgosSpace />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Index />} />
      {/* Catch‑all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
