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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading decks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">My Decks</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition"
          >
            + New Deck
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Deck</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="flex-1 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={createDeck}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">You don't have any decks yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
            >
              Create your first deck!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {decks.map(deck => (
              <div key={deck.id} className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-purple-400">{deck.name}</h3>
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Cards</span>
                    <span className="text-white">{getTotalCards(deck)} / 60</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getTotalCards(deck) === 60 ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min((getTotalCards(deck) / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex gap-1 mb-4 overflow-hidden">
                  {deck.cards.slice(0, 5).map(deckCard => (
                    <img
                      key={deckCard.id}
                      src={deckCard.card.imageSmall}
                      alt={deckCard.card.name}
                      className="w-10 sm:w-12 h-auto rounded"
                    />
                  ))}
                  {deck.cards.length > 5 && (
                    <div className="w-10 sm:w-12 h-14 sm:h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-xs">
                      +{deck.cards.length - 5}
                    </div>
                  )}
                  {deck.cards.length === 0 && (
                    <p className="text-gray-500 text-sm">No cards yet</p>
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