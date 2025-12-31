import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  imageSmall: string;
  supertype: string;
  types: string[];
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddCards, setShowAddCards] = useState(false);

  const fetchDeck = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}`);
      setDeck(response.data);
    } catch (error) {
      console.error('Failed to fetch deck:', error);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  const fetchValidation = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}/validate`);
      setValidation(response.data);
    } catch (error) {
      console.error('Failed to validate deck:', error);
    }
  }, [deckId]);

  const fetchAllCards = async () => {
    try {
      const response = await api.get('/cards');
      setAllCards(response.data);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };

  useEffect(() => {
    fetchDeck();
    fetchValidation();
    fetchAllCards();
  }, [fetchDeck, fetchValidation]);

  const addCardToDeck = async (cardId: string) => {
    try {
      await api.post(`/decks/${deckId}/cards`, { cardId, quantity: 1 });
      fetchDeck();
      fetchValidation();
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  };

  const updateCardQuantity = async (cardId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await api.delete(`/decks/${deckId}/cards/${cardId}`);
      } else {
        await api.patch(`/decks/${deckId}/cards/${cardId}`, { quantity });
      }
      fetchDeck();
      fetchValidation();
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const getTotalCards = () => {
    if (!deck) return 0;
    return deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  };

  const filteredCards = allCards.filter(card =>
    card.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Deck not found</p>
          <Link to="/decks" className="text-purple-400 hover:underline">Back to decks</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/decks" className="text-purple-400 hover:text-purple-300">← Back to Decks</Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{deck.name}</h2>
          <button
            onClick={() => setShowAddCards(!showAddCards)}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            {showAddCards ? 'Hide Cards' : '+ Add Cards'}
          </button>
        </div>

        {/* Validation Status */}
        <div className={`rounded-lg p-4 mb-6 ${validation?.valid ? 'bg-green-900' : 'bg-yellow-900'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${validation?.valid ? 'text-green-400' : 'text-yellow-400'}`}>
                {validation?.valid ? '✓' : '⚠'}
              </span>
              <span className="text-white font-bold">
                {getTotalCards()} / 60 cards
              </span>
            </div>
            {validation && !validation.valid && (
              <div className="text-yellow-300 text-sm">
                {validation.errors.map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Cards Panel */}
        {showAddCards && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Add Cards to Deck</h3>
            <input
              type="text"
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none mb-4"
            />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
              {filteredCards.slice(0, 50).map(card => (
                <div
                  key={card.id}
                  onClick={() => addCardToDeck(card.id)}
                  className="cursor-pointer hover:opacity-75 transition"
                >
                  <img
                    src={card.imageSmall}
                    alt={card.name}
                    className="w-full rounded"
                  />
                </div>
              ))}
            </div>
            {filteredCards.length > 50 && (
              <p className="text-gray-400 text-sm mt-2">Showing 50 of {filteredCards.length} cards. Refine your search.</p>
            )}
          </div>
        )}

        {/* Deck Cards */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-4">Deck Contents</h3>
          
          {deck.cards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No cards in this deck yet.</p>
              <button
                onClick={() => setShowAddCards(true)}
                className="text-green-400 hover:underline"
              >
                Add some cards!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {deck.cards.map(deckCard => (
                <div key={deckCard.id} className="bg-gray-700 rounded-lg p-2">
                  <img
                    src={deckCard.card.imageSmall}
                    alt={deckCard.card.name}
                    className="w-full rounded mb-2"
                  />
                  <p className="text-white text-xs sm:text-sm truncate mb-2">{deckCard.card.name}</p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => updateCardQuantity(deckCard.cardId, deckCard.quantity - 1)}
                      className="bg-red-600 hover:bg-red-700 text-white w-7 h-7 rounded text-sm"
                    >
                      -
                    </button>
                    <span className="text-white font-bold">{deckCard.quantity}</span>
                    <button
                      onClick={() => updateCardQuantity(deckCard.cardId, deckCard.quantity + 1)}
                      className="bg-green-600 hover:bg-green-700 text-white w-7 h-7 rounded text-sm"
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
    </div>
  );
}