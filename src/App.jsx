import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ManagerDashboard from './pages/ManagerDashboard'
import AgentReport from './pages/AgentReport'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/manager" replace />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/agent/:slug" element={<AgentReport />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
