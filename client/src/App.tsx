import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Foods } from './pages/Foods';
import { Tracking } from './pages/Tracking';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing key="landing" />} />
            <Route path="/dashboard" element={<Dashboard key="dashboard" />} />
            <Route path="/foods" element={<Foods key="foods" />} />
            <Route path="/tracking" element={<Tracking key="tracking" />} />
            <Route path="/reports" element={<Reports key="reports" />} />
            <Route path="/profile" element={<Profile key="profile" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

