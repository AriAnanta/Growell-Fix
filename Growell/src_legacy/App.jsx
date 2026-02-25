import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GrowellLanding from './pages/GrowellLanding';
import Login from './pages/Login';
import Register from './pages/Register';
import KaderDashboard from './pages/kader';
import Profile from './pages/Profile';
import ListDataBalita from './pages/ListDataBalita';
import ParentForm from './pages/ParentForm';
import ParentDashboard from './pages/ParentDashboard';

function App() {
  return (
    <Router basename="/Growell">
      <Routes>
        <Route path="/" element={<GrowellLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/kader" element={<KaderDashboard />} />
        <Route path="/orang-tua" element={<ParentDashboard />} />
        <Route path="/orang-tua/kuesioner" element={<ParentForm />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/data-balita" element={<ListDataBalita />} />
      </Routes>
    </Router>
  );
}

export default App

