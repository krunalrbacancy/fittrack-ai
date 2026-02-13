import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/foods', label: 'Foods', icon: '🍽️' },
    { path: '/weight', label: 'Weight', icon: '⚖️' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 pb-32 md:pb-6 safe-area-inset-bottom">
      {/* Top Navigation - Mobile Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40 md:relative">
        <div className="px-4 py-3 md:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-lg md:text-xl font-bold text-blue-600">FitTrack AI</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {/* Desktop Logout */}
              <button
                onClick={handleLogout}
                className="hidden md:block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="text-xl">🚪</span>
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="px-4 py-4 md:px-6 md:py-6 lg:px-8 max-w-7xl mx-auto pb-12 md:pb-6">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.path)
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive(item.path) ? 'text-blue-600' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
