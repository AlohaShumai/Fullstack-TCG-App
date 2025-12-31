import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  supertype: string;
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

interface ValidationResult {
  valid: boolean;
  totalCards: number;
  errors: string[];
}

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [search, setSearch] = useState('');

  const validateDeck = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}/validate`);
      setValidation(response.data);
    } catch (error) {
      console.error('Failed to validate deck:', error);
    }
  }, [deckId]);

  const fetchDeck = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}`);
      setDeck(response.data);
      validateDeck();
    } catch (error) {
      console.error('Failed to fetch deck:', error);
    } finally {
      setLoading(false);
    }
  }, [deckId, validateDeck]);

  useEffect(() => {
    const fetchAllCards = async () => {
      try {
        const response = await api.get('/cards');
        setAllCards(response.data);
      } catch (error) {
        console.error('Failed to fetch cards:', error);
      }
    };

    fetchDeck();
    fetchAllCards();
  }, [fetchDeck]);

  const addCardToDeck = async (cardId: string) => {
    try {
      await api.post(`/decks/${deckId}/cards`, { cardId, quantity: 1 });
      fetchDeck();
    } catch (error) {
      console.error('Failed to add card:', error);
      alert('Failed to add card. Check deck rules (max 4 copies, 60 cards total).');
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
    } catch (error) {
      console.error('Failed to update card:', error);
      alert('Failed to update. Check deck rules.');
    }
  };

  const filteredCards = allCards.filter(card =>
    card.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading deck...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Deck not found</p>
      </div>
    );
  }

  const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/decks" className="text-gray-400 hover:text-white">← Back to Decks</Link>
        </div>
      </nav>

      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white">{deck.name}</h2>
            <p className="text-gray-400">{totalCards} / 60 cards</p>
          </div>
          <button
            onClick={() => setShowAddCard(!showAddCard)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
          >
            {showAddCard ? 'Close' : '+ Add Cards'}
          </button>
        </div>

        {validation && (
          <div className={`rounded-lg p-4 mb-6 ${validation.valid ? 'bg-green-900' : 'bg-yellow-900'}`}>
            <p className={`font-bold ${validation.valid ? 'text-green-400' : 'text-yellow-400'}`}>
              {validation.valid ? '✓ Deck is valid!' : '⚠ Deck needs work'}
            </p>
            {validation.errors.map((error, i) => (
              <p key={i} className="text-yellow-300 text-sm">{error}</p>
            ))}
          </div>
        )}

        {showAddCard && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Add Cards</h3>
            <input
              type="text"
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none mb-4"
            />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
              {filteredCards.map(card => (
                <div
                  key={card.id}
                  onClick={() => addCardToDeck(card.id)}
                  className="cursor-pointer hover:opacity-75 transition"
                >
                  <img src={card.imageSmall} alt={card.name} className="w-full rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="text-xl font-bold text-white mb-4">Deck Cards</h3>
        {deck.cards.length === 0 ? (
          <p className="text-gray-400">No cards in this deck yet. Add some above!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {deck.cards.map(deckCard => (
              <div key={deckCard.id} className="bg-gray-800 rounded-lg p-3">
                <img
                  src={deckCard.card.imageSmall}
                  alt={deckCard.card.name}
                  className="w-full rounded mb-2"
                />
                <h4 className="text-white font-semibold text-sm truncate">{deckCard.card.name}</h4>
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => updateCardQuantity(deckCard.cardId, deckCard.quantity - 1)}
                    className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded"
                  >
                    -
                  </button>
                  <span className="text-white font-bold">{deckCard.quantity}</span>
                  <button
                    onClick={() => updateCardQuantity(deckCard.cardId, deckCard.quantity + 1)}
                    className="bg-green-600 hover:bg-green-700 text-white w-8 h-8 rounded"
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