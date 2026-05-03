import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Login              from "./Pages/Login"
import Dashboard          from "./Pages/Dashboard"
import UploadEvidence     from "./Pages/UploadEvidence"
import EvidenceManagement from "./Pages/EvidenceManagement"
import EvidenceDetails    from "./Pages/EvidenceDetails"
import RiskAnalysis       from "./Pages/RiskAnalysis"
import Reports            from "./Pages/Reports"
import AccessLogs         from "./Pages/AccessLogs"
import BlockchainViewer   from "./Pages/BlockchainViewer"

import Layout             from "./components/Layout"

function Protected({ children }) {
  return sessionStorage.getItem("dems_auth")
    ? children
    : <Navigate to="/login" replace />
}

function W({ children }) {   // shorthand: Protected + Layout
  return <Protected><Layout>{children}</Layout></Protected>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/login" replace />} />
        <Route path="/login"     element={<Login />} />

        <Route path="/dashboard"    element={<W><Dashboard /></W>} />
        <Route path="/upload"       element={<W><UploadEvidence /></W>} />
        <Route path="/evidence"     element={<W><EvidenceManagement /></W>} />
        <Route path="/risk"         element={<W><RiskAnalysis /></W>} />
        <Route path="/logs"         element={<W><AccessLogs /></W>} />
        <Route path="/reports"      element={<W><Reports /></W>} />
        <Route path="/blockchain"   element={<W><BlockchainViewer /></W>} />

        <Route path="/evidence/:id" element={<Protected><EvidenceDetails /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App