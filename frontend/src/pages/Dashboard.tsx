import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-white">TCG App</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm sm:text-base">{user?.email}</span>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Link
            to="/cards"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition border-l-4 border-blue-500"
          >
            <h3 className="text-xl font-bold text-blue-400 mb-2">Browse Cards</h3>
            <p className="text-gray-400 text-sm">Search and view all available Pokemon cards</p>
          </Link>

          <Link
            to="/collection"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition border-l-4 border-green-500"
          >
            <h3 className="text-xl font-bold text-green-400 mb-2">My Collection</h3>
            <p className="text-gray-400 text-sm">Manage your personal card collection</p>
          </Link>

          <Link
            to="/decks"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition border-l-4 border-purple-500"
          >
            <h3 className="text-xl font-bold text-purple-400 mb-2">My Decks</h3>
            <p className="text-gray-400 text-sm">Build and manage your decks</p>
          </Link>

          <Link
            to="/advisor"
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition border-l-4 border-yellow-500"
          >
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Deck Advisor</h3>
            <p className="text-gray-400 text-sm">Get AI-powered deck building advice</p>
          </Link>
        </div>
      </div>
    </div>
  );
}