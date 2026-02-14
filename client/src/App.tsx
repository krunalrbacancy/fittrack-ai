import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Foods } from './pages/Foods';
import { Weight } from './pages/Weight';
import { Profile } from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/foods" element={<Foods />} />
          <Route path="/weight" element={<Weight />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

