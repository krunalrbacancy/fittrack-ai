import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Foods } from './pages/Foods';
import { Weight } from './pages/Weight';
import { Profile } from './pages/Profile';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing key="landing" />} />
            <Route path="/dashboard" element={<Dashboard key="dashboard" />} />
            <Route path="/foods" element={<Foods key="foods" />} />
            <Route path="/weight" element={<Weight key="weight" />} />
            <Route path="/profile" element={<Profile key="profile" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

