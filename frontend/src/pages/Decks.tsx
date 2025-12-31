import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  imageSmall: string;
}

interface DeckCard {
  id: string;
  cardId: string;
  quantity: number;
  card: Card;
}

interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
}

export default function Decks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await api.get('/decks');
      setDecks(response.data);
    } catch (error) {
      console.error('Failed to fetch decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    try {
      await api.post('/decks', { name: newDeckName });
      setNewDeckName('');
      setShowCreateForm(false);
      fetchDecks();
    } catch (error) {
      console.error('Failed to create deck:', error);
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await api.delete(`/decks/${deckId}`);
      fetchDecks();
    } catch (error) {
      console.error('Failed to delete deck:', error);
    }
  };

  const getTotalCards = (deck: Deck) => {
    return deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading decks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">My Decks</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition"
          >
            + New Deck
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Deck</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={createDeck}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">You don't have any decks yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-purple-400 hover:underline"
            >
              Create your first deck!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.map(deck => (
              <div key={deck.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-purple-400">{deck.name}</h3>
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-gray-400 mb-4">
                  {getTotalCards(deck)} / 60 cards
                </p>
                <div className="flex gap-2 mb-4">
                  {deck.cards.slice(0, 4).map(deckCard => (
                    <img
                      key={deckCard.id}
                      src={deckCard.card.imageSmall}
                      alt={deckCard.card.name}
                      className="w-12 h-auto rounded"
                    />
                  ))}
                  {deck.cards.length > 4 && (
                    <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm">
                      +{deck.cards.length - 4}
                    </div>
                  )}
                </div>
                <Link
                  to={`/decks/${deck.id}`}
                  className="block text-center bg-purple-600 hover:bg-purple-700 text-white py-2 rounded transition"
                >
                  Edit Deck
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}