import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  imageSmall: string;
  imageLarge?: string;
  supertype: string;
  types: string[];
  hp?: string;
  abilities?: Array<{ name: string; text: string }>;
  attacks?: Array<{ name: string; damage: string; text: string }>;
  legalities: {
    standard?: string;
    expanded?: string;
    unlimited?: string;
  } | null;
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
  format: string;
  cards: DeckCard[];
}

interface ValidationResult {
  valid: boolean;
  format: string;
  totalCards: number;
  errors: string[];
}

interface Collection {
  id: string;
  name: string;
  cards?: Array<{
    cardId: string;
    card: Card;
    quantity: number;
  }>;
}

export default function DeckDetail() {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [message, setMessage] = useState('');
  const [cardPage, setCardPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Collection filter state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [cardSource, setCardSource] = useState<'all' | 'collections'>('all');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

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

  const fetchCollections = useCallback(async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  }, []);

  const fetchAllCards = useCallback(async (page = 1, append = false) => {
    if (!deck) return;
    try {
      if (page > 1) setLoadingMore(true);
      
      const params = new URLSearchParams();
      params.append('limit', '50');
      params.append('page', page.toString());
      if (deck.format === 'standard') {
        params.append('format', 'standard');
      }
      if (search) {
        params.append('search', search);
      }
      if (typeFilter) {
        params.append('supertype', typeFilter);
      }
      const response = await api.get(`/cards?${params.toString()}`);
      const newCards = response.data.data || [];
      
      if (append) {
        setAllCards(prev => [...prev, ...newCards]);
      } else {
        setAllCards(newCards);
      }
      setTotalCards(response.data.meta?.total || 0);
      setCardPage(page);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [deck, search, typeFilter]);

  const fetchCollectionCards = useCallback(async () => {
    if (selectedCollectionIds.length === 0) {
      setAllCards([]);
      setTotalCards(0);
      return;
    }
    
    try {
      // Fetch all selected collections with their cards
      const responses = await Promise.all(
        selectedCollectionIds.map(id => api.get(`/collections/${id}`))
      );
      
      // Combine all cards from all collections, removing duplicates
      const cardMap = new Map<string, Card>();
      responses.forEach(response => {
        const collection = response.data;
        collection.cards?.forEach((item: { card: Card }) => {
          if (!cardMap.has(item.card.id)) {
            // Apply filters
            const matchesSearch = !search || 
              item.card.name.toLowerCase().includes(search.toLowerCase());
            const matchesType = !typeFilter || 
              item.card.supertype === typeFilter;
            const matchesFormat = deck?.format !== 'standard' || 
              item.card.legalities?.standard === 'Legal';
            
            if (matchesSearch && matchesType && matchesFormat) {
              cardMap.set(item.card.id, item.card);
            }
          }
        });
      });
      
      const cards = Array.from(cardMap.values());
      setAllCards(cards);
      setTotalCards(cards.length);
    } catch (error) {
      console.error('Failed to fetch collection cards:', error);
    }
  }, [selectedCollectionIds, search, typeFilter, deck?.format]);

  useEffect(() => {
    fetchDeck();
    fetchValidation();
    fetchCollections();
  }, [fetchDeck, fetchValidation, fetchCollections]);

  useEffect(() => {
    if (deck) {
      setCardPage(1);
      if (cardSource === 'all') {
        fetchAllCards(1, false);
      } else {
        fetchCollectionCards();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, search, typeFilter, cardSource, selectedCollectionIds]);

  const getCardQuantityInDeck = (cardId: string): number => {
    if (!deck) return 0;
    const deckCard = deck.cards.find((dc) => dc.cardId === cardId);
    return deckCard?.quantity || 0;
  };

  const addCardToDeck = async (cardId: string, cardName: string) => {
    setError('');
    try {
      await api.post(`/decks/${deckId}/cards`, { cardId, quantity: 1 });
      fetchDeck();
      fetchValidation();
      showMessage(`Added ${cardName}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to add card');
      setTimeout(() => setError(''), 5000);
    }
  };

  const updateCardQuantity = async (cardId: string, quantity: number) => {
    setError('');
    try {
      if (quantity <= 0) {
        await api.delete(`/decks/${deckId}/cards/${cardId}`);
      } else {
        await api.patch(`/decks/${deckId}/cards/${cardId}`, { quantity });
      }
      fetchDeck();
      fetchValidation();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update card');
      setTimeout(() => setError(''), 5000);
    }
  };

  const updateDeckFormat = async (format: string) => {
    setError('');
    try {
      await api.patch(`/decks/${deckId}`, { format });
      fetchDeck();
      fetchValidation();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to update format');
      setTimeout(() => setError(''), 5000);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const getTotalCards = () => {
    if (!deck) return 0;
    return deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  };

  const getFormatBadgeColor = (format: string) => {
    return format === 'standard'
      ? 'bg-green-600 text-green-100'
      : 'bg-blue-600 text-blue-100';
  };

  // Group deck cards by supertype
  const groupedDeckCards = deck?.cards.reduce(
    (acc, dc) => {
      const type = dc.card.supertype || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(dc);
      return acc;
    },
    {} as Record<string, DeckCard[]>
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
          <Link to="/decks" className="text-purple-400 hover:underline">
            Back to decks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">
            TCG App
          </Link>
          <Link to="/decks" className="text-purple-400 hover:text-purple-300">
            ← Back to Decks
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{deck.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <select
                  value={deck.format}
                  onChange={(e) => updateDeckFormat(e.target.value)}
                  className="text-sm p-1 rounded bg-gray-700 text-white border border-gray-600"
                >
                  <option value="unlimited">Unlimited</option>
                  <option value="standard">Standard</option>
                </select>
                <span
                  className={`text-xs px-2 py-1 rounded ${getFormatBadgeColor(deck.format)}`}
                >
                  {deck.format === 'standard' ? 'Standard' : 'Unlimited'}
                </span>
              </div>
            </div>

            {/* Card Count & Validation */}
            <div
              className={`px-4 py-2 rounded-lg ${validation?.valid ? 'bg-green-900' : 'bg-yellow-900'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xl ${validation?.valid ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  {validation?.valid ? '✓' : '⚠'}
                </span>
                <span className="text-white font-bold text-lg">
                  {getTotalCards()} / 60
                </span>
              </div>
              {validation && !validation.valid && validation.errors.length > 0 && (
                <p className="text-yellow-300 text-xs mt-1">
                  {validation.errors[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900 text-red-200 text-center py-2">{error}</div>
      )}

      {/* Success Message */}
      {message && (
        <div
          className="fixed bottom-6 left-1/2 bg-green-500 text-white py-2 px-4 rounded-full shadow-lg z-50 flex items-center gap-2"
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {/* Main Content - Side by Side */}
      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Panel - Card Browser */}
          <div className="lg:w-1/2 xl:w-3/5">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-4">
              <h2 className="text-lg font-bold text-white mb-3">
                Add Cards
                <span className="text-gray-400 text-sm font-normal ml-2">
                  {deck.format === 'standard'
                    ? '(Standard legal only)'
                    : '(All cards)'}
                </span>
              </h2>

              {/* Card Source Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setCardSource('all');
                    setSelectedCollectionIds([]);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    cardSource === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Cards
                </button>
                <button
                  onClick={() => setShowCollectionPicker(true)}
                  className={`px-3 py-1 rounded-lg text-sm transition flex items-center gap-1 ${
                    cardSource === 'collections'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  My Collections
                  {selectedCollectionIds.length > 0 && (
                    <span className="bg-white bg-opacity-20 px-1.5 rounded text-xs">
                      {selectedCollectionIds.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Selected Collections Display */}
              {cardSource === 'collections' && selectedCollectionIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {collections
                    .filter(c => selectedCollectionIds.includes(c.id))
                    .map(c => (
                      <span
                        key={c.id}
                        className="bg-green-700 text-green-100 text-xs px-2 py-1 rounded flex items-center gap-1"
                      >
                        {c.name}
                        <button
                          onClick={() => {
                            const newIds = selectedCollectionIds.filter(id => id !== c.id);
                            setSelectedCollectionIds(newIds);
                            if (newIds.length === 0) setCardSource('all');
                          }}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none text-sm"
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="p-2 rounded bg-gray-700 text-white border border-gray-600 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="Pokémon">Pokémon</option>
                  <option value="Trainer">Trainer</option>
                  <option value="Energy">Energy</option>
                </select>
              </div>

              {/* Card Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {allCards.map((card) => {
                  const qtyInDeck = getCardQuantityInDeck(card.id);
                  return (
                    <div
                      key={card.id}
                      className="relative cursor-pointer group"
                      onClick={() => addCardToDeck(card.id, card.name)}
                      onMouseEnter={() => setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {card.imageSmall ? (
                        <img
                          src={card.imageSmall}
                          alt={card.name}
                          className={`w-full rounded transition hover:scale-105 ${
                            qtyInDeck > 0
                              ? 'ring-2 ring-purple-500'
                              : 'hover:ring-2 hover:ring-green-500'
                          }`}
                        />
                      ) : (
                        <div className={`w-full aspect-[2.5/3.5] rounded bg-gray-700 flex items-center justify-center ${
                          qtyInDeck > 0 ? 'ring-2 ring-purple-500' : ''
                        }`}>
                          <span className="text-gray-400 text-xs text-center px-1">{card.name}</span>
                        </div>
                      )}
                      {/* Quantity Badge */}
                      {qtyInDeck > 0 && (
                        <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {qtyInDeck}
                        </div>
                      )}
                      {/* Card Name on Hover */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition rounded-b">
                        {card.name}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Load More / Card Count */}
              <div className="mt-3 text-center">
                <p className="text-gray-400 text-xs mb-2">
                  Showing {allCards.length} {cardSource === 'collections' ? 'cards from selected collections' : `of ${totalCards} cards`}
                </p>
                {cardSource === 'all' && allCards.length < totalCards && (
                  <button
                    onClick={() => fetchAllCards(cardPage + 1, true)}
                    disabled={loadingMore}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition text-sm"
                  >
                    {loadingMore ? 'Loading...' : 'Load More Cards'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Deck Contents */}
          <div className="lg:w-1/2 xl:w-2/5">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-white mb-4">
                Deck Contents
                <span className="text-gray-400 text-sm font-normal ml-2">
                  ({getTotalCards()} cards)
                </span>
              </h2>

              {deck.cards.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">📦</p>
                  <p>Your deck is empty</p>
                  <p className="text-sm">Click cards on the left to add them</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Pokemon Section */}
                  {groupedDeckCards?.['Pokémon'] &&
                    groupedDeckCards['Pokémon'].length > 0 && (
                      <div>
                        <h3 className="text-purple-400 font-semibold text-sm mb-2 flex items-center gap-2">
                          <span>Pokémon</span>
                          <span className="text-gray-500">
                            (
                            {groupedDeckCards['Pokémon'].reduce(
                              (sum, dc) => sum + dc.quantity,
                              0
                            )}
                            )
                          </span>
                        </h3>
                        <div className="space-y-1">
                          {groupedDeckCards['Pokémon'].map((dc) => (
                            <DeckCardRow
                              key={dc.id}
                              deckCard={dc}
                              onUpdateQuantity={updateCardQuantity}
                              onHover={setHoveredCard}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Trainer Section */}
                  {groupedDeckCards?.['Trainer'] &&
                    groupedDeckCards['Trainer'].length > 0 && (
                      <div>
                        <h3 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                          <span>Trainer</span>
                          <span className="text-gray-500">
                            (
                            {groupedDeckCards['Trainer'].reduce(
                              (sum, dc) => sum + dc.quantity,
                              0
                            )}
                            )
                          </span>
                        </h3>
                        <div className="space-y-1">
                          {groupedDeckCards['Trainer'].map((dc) => (
                            <DeckCardRow
                              key={dc.id}
                              deckCard={dc}
                              onUpdateQuantity={updateCardQuantity}
                              onHover={setHoveredCard}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Energy Section */}
                  {groupedDeckCards?.['Energy'] &&
                    groupedDeckCards['Energy'].length > 0 && (
                      <div>
                        <h3 className="text-yellow-400 font-semibold text-sm mb-2 flex items-center gap-2">
                          <span>Energy</span>
                          <span className="text-gray-500">
                            (
                            {groupedDeckCards['Energy'].reduce(
                              (sum, dc) => sum + dc.quantity,
                              0
                            )}
                            )
                          </span>
                        </h3>
                        <div className="space-y-1">
                          {groupedDeckCards['Energy'].map((dc) => (
                            <DeckCardRow
                              key={dc.id}
                              deckCard={dc}
                              onUpdateQuantity={updateCardQuantity}
                              onHover={setHoveredCard}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Preview Tooltip */}
      {hoveredCard && (
        <div
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-50 pointer-events-none hidden lg:block"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <div className="bg-gray-800 rounded-lg p-3 shadow-2xl border border-gray-700 w-64">
            <img
              src={hoveredCard.imageSmall}
              alt={hoveredCard.name}
              className="w-full rounded mb-2"
            />
            <h3 className="text-white font-bold text-sm">{hoveredCard.name}</h3>
            <p className="text-gray-400 text-xs">
              {hoveredCard.supertype}
              {hoveredCard.hp && ` • ${hoveredCard.hp} HP`}
            </p>
            {hoveredCard.types && hoveredCard.types.length > 0 && (
              <p className="text-gray-400 text-xs">
                Type: {hoveredCard.types.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes bubblePop {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(30px) scale(0.5);
          }
          50% {
            transform: translateX(-50%) translateY(-5px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* Collection Picker Modal */}
      {showCollectionPicker && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Filter by Collection</h3>
            <p className="text-gray-400 text-sm mb-4">
              Select which collections to show cards from:
            </p>
            
            {collections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>You don't have any collections yet.</p>
                <Link
                  to="/collection"
                  className="text-green-400 hover:underline mt-2 inline-block"
                >
                  Create a collection first
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {collections.map((col) => (
                  <label
                    key={col.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition ${
                      selectedCollectionIds.includes(col.id)
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.includes(col.id)}
                      onChange={() => {
                        setSelectedCollectionIds(prev =>
                          prev.includes(col.id)
                            ? prev.filter(id => id !== col.id)
                            : [...prev, col.id]
                        );
                      }}
                      className="mr-3 w-4 h-4"
                    />
                    <span className="text-white">{col.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedCollectionIds([]);
                  setCardSource('all');
                  setShowCollectionPicker(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
              >
                Clear
              </button>
              <button
                onClick={() => setShowCollectionPicker(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedCollectionIds.length > 0) {
                    setCardSource('collections');
                  }
                  setShowCollectionPicker(false);
                }}
                disabled={selectedCollectionIds.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Deck Card Row Component
function DeckCardRow({
  deckCard,
  onUpdateQuantity,
  onHover,
}: {
  deckCard: DeckCard;
  onUpdateQuantity: (cardId: string, quantity: number) => void;
  onHover: (card: Card | null) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 bg-gray-700 rounded p-2 hover:bg-gray-600 transition"
      onMouseEnter={() => onHover(deckCard.card)}
      onMouseLeave={() => onHover(null)}
    >
      <img
        src={deckCard.card.imageSmall}
        alt={deckCard.card.name}
        className="w-10 h-14 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{deckCard.card.name}</p>
        <p className="text-gray-400 text-xs">
          {deckCard.card.types?.join(', ') || deckCard.card.supertype}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() =>
            onUpdateQuantity(deckCard.cardId, deckCard.quantity - 1)
          }
          className="bg-red-600 hover:bg-red-700 text-white w-6 h-6 rounded text-sm flex items-center justify-center"
        >
          -
        </button>
        <span className="text-white font-bold w-6 text-center">
          {deckCard.quantity}
        </span>
        <button
          onClick={() =>
            onUpdateQuantity(deckCard.cardId, deckCard.quantity + 1)
          }
          className="bg-green-600 hover:bg-green-700 text-white w-6 h-6 rounded text-sm flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}
