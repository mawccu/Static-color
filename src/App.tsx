import { HashRouter, Route, Routes } from 'react-router-dom'
import { DbProvider } from './data/db'
import Layout from './app/Layout'
import LangGate from './app/LangGate'

import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import Samples from './pages/Samples'
import Quality from './pages/Quality'
import Dyes from './pages/Dyes'
import Chemicals from './pages/Chemicals'
import WashTypes from './pages/WashTypes'
import Machines from './pages/Machines'
import Fabrics from './pages/Fabrics'
import Clients from './pages/Clients'
import Estimates from './pages/Estimates'
import Invoices from './pages/Invoices'
import CashBook from './pages/CashBook'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <DbProvider>
      <LangGate>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="samples" element={<Samples />} />
              <Route path="quality" element={<Quality />} />
              <Route path="dyes" element={<Dyes />} />
              <Route path="chemicals" element={<Chemicals />} />
              <Route path="wash-types" element={<WashTypes />} />
              <Route path="machines" element={<Machines />} />
              <Route path="fabrics" element={<Fabrics />} />
              <Route path="clients" element={<Clients />} />
              <Route path="estimates" element={<Estimates />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="cashbook" element={<CashBook />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Dashboard />} />
            </Route>
          </Routes>
        </HashRouter>
      </LangGate>
    </DbProvider>
  )
}
