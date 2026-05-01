import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import BigRocks from './pages/BigRocks';
import Weekly from './pages/Weekly';
import Interrupts from './pages/Interrupts';
import Team from './pages/Team';
import Export from './pages/Export';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter basename="/team-dashboard">
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/big-rocks" element={<BigRocks />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/interrupts" element={<Interrupts />} />
              <Route path="/team" element={<Team />} />
              <Route path="/export" element={<Export />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
