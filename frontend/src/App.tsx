import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import Collection from './pages/Collection';
import Decks from './pages/Decks';
import DeckDetail from './pages/DeckDetail';
import Advisor from './pages/Advisor';
import FloatingChat from './components/FloatingChat';
import Nav from './components/Nav';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" /> : children;
}

// Persistent layout — Nav mounts once and never re-mounts on navigation
function AppLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Nav />
      <div key={location.pathname} className="flex-1 flex flex-col page-enter">
        <Outlet />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* All authenticated routes share the persistent Nav via AppLayout */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/decks/:deckId" element={<DeckDetail />} />
        <Route path="/advisor" element={<Advisor />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <AppRoutes />
          <FloatingChat />
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
