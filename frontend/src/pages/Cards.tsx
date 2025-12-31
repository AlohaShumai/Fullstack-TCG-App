import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  hp: string | null;
  imageSmall: string;
}

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.get('/cards');
      setCards(response.data);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (cardId: string, cardName: string) => {
    try {
      await api.post('/collections', { cardId, quantity: 1 });
      setMessage(`Added ${cardName} to collection!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to add to collection:', error);
      setMessage('Failed to add card');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading cards...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/collection" className="text-green-400 hover:text-green-300">My Collection</Link>
        </div>
      </nav>

      {message && (
        <div className="bg-green-600 text-white text-center py-2">
          {message}
        </div>
      )}

      <div className="container mx-auto p-8">
        <h2 className="text-3xl font-bold text-white mb-6">Browse Cards</h2>

        <input
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-8"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map(card => (
            <div key={card.id} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition">
              <img
                src={card.imageSmall}
                alt={card.name}
                className="w-full rounded mb-2"
              />
              <h3 className="text-white font-semibold text-sm truncate">{card.name}</h3>
              <p className="text-gray-400 text-xs mb-2">{card.supertype}</p>
              <button
                onClick={() => addToCollection(card.id, card.name)}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-1 rounded transition"
              >
                + Add
              </button>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <p className="text-gray-400 text-center">No cards found.</p>
        )}
      </div>
    </div>
  );
}