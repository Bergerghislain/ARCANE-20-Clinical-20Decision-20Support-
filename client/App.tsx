import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientFile from "./pages/PatientFile";
import AddPatient from "./pages/AddPatient";
import ArgosSpace from "./pages/ArgosSpace";
import NotFound from "./pages/NotFound";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/patient/:patientId" element={<PatientFile />} />
      <Route path="/add-patient" element={<AddPatient />} />
      <Route path="/argos" element={<ArgosSpace />} />
      <Route path="/" element={<Index />} />
      {/* Catch‑all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;
