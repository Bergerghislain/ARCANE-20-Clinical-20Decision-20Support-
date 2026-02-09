import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientFile from "./pages/PatientFile";
import AddPatient from "./pages/AddPatient";
import ArgosSpace from "./pages/ArgosSpace";
import NotFound from "./pages/NotFound";
import { isAuthenticated } from "./lib/auth";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
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
