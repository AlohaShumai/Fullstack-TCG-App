import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  imageSmall: string;
}

interface CollectionItem {
  id: string;
  cardId: string;
  quantity: number;
  card: Card;
}

interface Stats {
  totalCards: number;
  uniqueCards: number;
  byType: Record<string, number>;
}

export default function Collection() {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollection();
    fetchStats();
  }, []);

  const fetchCollection = async () => {
    try {
      const response = await api.get('/collections');
      setCollection(response.data);
    } catch (error) {
      console.error('Failed to fetch collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/collections/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const updateQuantity = async (cardId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await api.delete(`/collections/${cardId}`);
      } else {
        await api.patch(`/collections/${cardId}`, { quantity });
      }
      fetchCollection();
      fetchStats();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/cards" className="text-blue-400 hover:text-blue-300">Browse Cards</Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">My Collection</h2>

        {stats && (
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-8">
            <h3 className="text-xl font-bold text-green-400 mb-4">Collection Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Total Cards</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalCards}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Unique Cards</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{stats.uniqueCards}</p>
              </div>
            </div>
            {Object.keys(stats.byType).length > 0 && (
              <div className="mt-4">
                <p className="text-gray-400 mb-2">By Type</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <span key={type} className="bg-gray-700 px-3 py-1 rounded text-white text-sm">
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {collection.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Your collection is empty.</p>
            <Link to="/cards" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition">
              Browse cards to add some!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {collection.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-2 sm:p-3">
                <img
                  src={item.card.imageSmall}
                  alt={item.card.name}
                  className="w-full rounded mb-2"
                />
                <h3 className="text-white font-semibold text-xs sm:text-sm truncate">{item.card.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => updateQuantity(item.cardId, item.quantity - 1)}
                    className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded text-lg"
                  >
                    -
                  </button>
                  <span className="text-white font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cardId, item.quantity + 1)}
                    className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}