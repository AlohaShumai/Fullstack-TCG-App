import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import Collection from './pages/Collection';
import Decks from './pages/Decks';
import DeckDetail from './pages/DeckDetail';
import Advisor from './pages/Advisor';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/cards" element={<PrivateRoute><Cards /></PrivateRoute>} />
      <Route path="/collection" element={<PrivateRoute><Collection /></PrivateRoute>} />
      <Route path="/decks" element={<PrivateRoute><Decks /></PrivateRoute>} />
      <Route path="/decks/:deckId" element={<PrivateRoute><DeckDetail /></PrivateRoute>} />
      <Route path="/advisor" element={<PrivateRoute><Advisor /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;