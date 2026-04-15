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
  const [energyTypeFilter, setEnergyTypeFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [allSets, setAllSets] = useState<{ id: string; name: string; standardLegal: boolean }[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cardPage, setCardPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collectionAllCards, setCollectionAllCards] = useState<Card[]>([]);
  const [collectionPage, setCollectionPage] = useState(1);

  const CARDS_PER_PAGE = 30;

  // Collapsible deck sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleSection = (type: string) =>
    setCollapsed(prev => ({ ...prev, [type]: !prev[type] }));

  const HEADER_H = 32;

  // Collection filter state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [cardSource, setCardSource] = useState<'all' | 'collections'>('all');
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [respectCollectionQty, setRespectCollectionQty] = useState(false);
  const [collectionQuantities, setCollectionQuantities] = useState<Record<string, number>>({});

  const fetchDeck = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}`);
      setDeck(response.data);
    } catch {
      setError('Failed to load deck');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  const fetchValidation = useCallback(async () => {
    try {
      const response = await api.get(`/decks/${deckId}/validate`);
      setValidation(response.data);
    } catch {
      // validation badge just won't update
    }
  }, [deckId]);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
    } catch {
      // collection filter just won't populate
    }
  }, []);

  const fetchSets = useCallback(async () => {
    try {
      const response = await api.get('/cards/sets');
      setAllSets(response.data);
    } catch {
      // set filter just won't populate
    }
  }, []);

  const fetchAllCards = useCallback(async (page = 1, append = false) => {
    if (!deck) return;
    try {
      if (page > 1) setLoadingMore(true);

      const params = new URLSearchParams();
      params.append('limit', CARDS_PER_PAGE.toString());
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
      if (energyTypeFilter) {
        params.append('type', energyTypeFilter);
      }
      if (setFilter) {
        params.append('set', setFilter);
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
    } catch {
      // card browser just stays empty
    } finally {
      setLoadingMore(false);
    }
  }, [deck, search, typeFilter, energyTypeFilter, setFilter]);

  const fetchCollectionCards = useCallback(async () => {
    if (selectedCollectionIds.length === 0) {
      setAllCards([]);
      setTotalCards(0);
      setCollectionQuantities({});
      return;
    }

    try {
      const responses = await Promise.all(
        selectedCollectionIds.map(id => api.get(`/collections/${id}`))
      );

      const cardMap = new Map<string, Card>();
      const qtyMap: Record<string, number> = {};

      responses.forEach(response => {
        const collection = response.data;
        collection.cards?.forEach((item: { card: Card; quantity: number }) => {
          // Sum quantities across all selected collections
          qtyMap[item.card.id] = (qtyMap[item.card.id] || 0) + item.quantity;

          if (!cardMap.has(item.card.id)) {
            const matchesSearch = !search ||
              item.card.name.toLowerCase().includes(search.toLowerCase());
            const matchesType = !typeFilter ||
              item.card.supertype === typeFilter;
            const matchesEnergyType = !energyTypeFilter ||
              item.card.types?.includes(energyTypeFilter);
            const matchesFormat = deck?.format !== 'standard' ||
              item.card.legalities?.standard === 'Legal';

            if (matchesSearch && matchesType && matchesEnergyType && matchesFormat) {
              cardMap.set(item.card.id, item.card);
            }
          }
        });
      });

      setCollectionQuantities(qtyMap);
      const cards = Array.from(cardMap.values());
      setCollectionAllCards(cards);
      setCollectionPage(1);
      setAllCards(cards.slice(0, CARDS_PER_PAGE));
      setTotalCards(cards.length);
    } catch {
      // collection cards just won't load
    }
  }, [selectedCollectionIds, search, typeFilter, energyTypeFilter, deck?.format]);

  useEffect(() => {
    fetchDeck();
    fetchValidation();
    fetchCollections();
    fetchSets();
  }, [fetchDeck, fetchValidation, fetchCollections, fetchSets]);

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
  }, [deck, search, typeFilter, energyTypeFilter, setFilter, cardSource, selectedCollectionIds]);

  const getCardQuantityInDeck = (cardId: string): number => {
    if (!deck) return 0;
    const deckCard = deck.cards.find((dc) => dc.cardId === cardId);
    return deckCard?.quantity || 0;
  };

  const addCardToDeck = async (cardId: string, cardName: string) => {
    setError('');
    if (respectCollectionQty && cardSource === 'collections') {
      const inCollection = collectionQuantities[cardId] || 0;
      const inDeck = getCardQuantityInDeck(cardId);
      if (inDeck >= inCollection) {
        setError(`Only ${inCollection} ${cardName} in your collection`);
        setTimeout(() => setError(''), 4000);
        return;
      }
    }
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
      ? 'bg-indigo-900 text-indigo-300'
      : 'bg-slate-700 text-slate-300';
  };

  // Group deck cards by supertype, sorted alphabetically for stable ordering
  const groupedDeckCards = deck?.cards
    .slice()
    .sort((a, b) => a.card.name.localeCompare(b.card.name))
    .reduce(
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-100 text-xl">Loading deck...</p>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-100 text-xl mb-4">Deck not found</p>
          <Link to="/decks" className="text-indigo-400 hover:underline">
            Back to decks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex-shrink-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Link to="/decks" className="text-indigo-400 hover:text-indigo-300 text-sm">← Decks</Link>
            <h1 className="text-lg font-bold text-slate-100">{deck.name}</h1>
            <select
              value={deck.format}
              onChange={(e) => updateDeckFormat(e.target.value)}
              className="text-xs p-1 rounded bg-slate-700 text-white border border-slate-600"
            >
              <option value="unlimited">Unlimited</option>
              <option value="standard">Standard</option>
            </select>
            <span className={`text-xs px-2 py-0.5 rounded ${getFormatBadgeColor(deck.format)}`}>
              {deck.format === 'standard' ? 'Standard' : 'Unlimited'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-red-400 text-xs">{error}</span>}
            <div className={`px-3 py-1 rounded-lg flex items-center gap-2 ${validation?.valid ? 'bg-green-900' : 'bg-yellow-900'}`}>
              <span className={validation?.valid ? 'text-green-400' : 'text-yellow-400'}>
                {validation?.valid ? '✓' : '⚠'}
              </span>
              <span className="text-white font-bold">{getTotalCards()} / 60</span>
              {validation && !validation.valid && validation.errors.length > 0 && (
                <span className="text-yellow-300 text-xs">{validation.errors[0]}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div
          className="fixed bottom-6 left-1/2 bg-green-700 text-white py-2 px-4 rounded-full shadow-lg z-50 flex items-center gap-2"
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {/* Main Content - fills remaining height */}
      <div className="flex-1 overflow-hidden p-4 min-h-0">
        <div className="flex gap-4 h-full">
          {/* Left Panel - Card Browser */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="bg-slate-800 rounded-lg p-3 flex flex-col h-full min-h-0">
              <h2 className="text-sm font-bold text-slate-100 mb-2">
                Add Cards
                <span className="text-slate-400 font-normal ml-2">
                  {deck.format === 'standard' ? '(Standard legal only)' : '(All cards)'}
                </span>
              </h2>

              {/* Card Source Toggle */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    setCardSource('all');
                    setSelectedCollectionIds([]);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    cardSource === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All Cards
                </button>
                <button
                  onClick={() => setShowCollectionPicker(true)}
                  className={`px-3 py-1 rounded-lg text-sm transition flex items-center gap-1 ${
                    cardSource === 'collections'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  My Collections
                  {selectedCollectionIds.length > 0 && (
                    <span className="bg-white bg-opacity-20 px-1.5 rounded text-xs">
                      {selectedCollectionIds.length}
                    </span>
                  )}
                </button>
                {cardSource === 'collections' && selectedCollectionIds.length > 0 && (
                  <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
                    <div
                      onClick={() => setRespectCollectionQty(v => !v)}
                      className={`relative w-8 h-4 rounded-full transition-colors ${
                        respectCollectionQty ? 'bg-indigo-500' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                        respectCollectionQty ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-slate-300 text-xs whitespace-nowrap">Limit by collection qty</span>
                  </label>
                )}
              </div>

              {/* Selected Collections Display */}
              {cardSource === 'collections' && selectedCollectionIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {collections
                    .filter(c => selectedCollectionIds.includes(c.id))
                    .map(c => (
                      <span
                        key={c.id}
                        className="bg-indigo-700 text-indigo-100 text-xs px-2 py-1 rounded flex items-center gap-1"
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
              <div className="flex flex-col gap-1.5 mb-2">
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-slate-700 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none text-sm"
                />
                <div className="flex gap-1.5">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded bg-slate-700 text-white border border-slate-600 text-sm"
                  >
                    <option value="">All Supertypes</option>
                    <option value="Pokémon">Pokémon</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Energy">Energy</option>
                  </select>
                  <select
                    value={energyTypeFilter}
                    onChange={(e) => setEnergyTypeFilter(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded bg-slate-700 text-white border border-slate-600 text-sm"
                  >
                    <option value="">All Types</option>
                    {['Fire','Water','Grass','Lightning','Psychic','Fighting','Darkness','Metal','Dragon','Fairy','Colorless'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={setFilter}
                    onChange={(e) => setSetFilter(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded bg-slate-700 text-white border border-slate-600 text-sm"
                  >
                    <option value="">All Sets</option>
                    {(deck.format === 'standard' ? allSets.filter(s => s.standardLegal) : allSets).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  {(search || typeFilter || energyTypeFilter || setFilter) && (
                    <button
                      onClick={() => { setSearch(''); setTypeFilter(''); setEnergyTypeFilter(''); setSetFilter(''); }}
                      className="px-2 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-sm transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Card Grid */}
              {(() => {
                const displayCards = (cardSource === 'collections' && respectCollectionQty)
                  ? allCards.filter(card =>
                      (collectionQuantities[card.id] || 0) > getCardQuantityInDeck(card.id)
                    )
                  : allCards;
                return (
                  /* Scroll wrapper — handles overflow; grid inside is overflow:visible so scale-105 doesn't clip */
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '12px',
                        alignContent: 'start',
                        padding: '4px',
                      }}
                    >
                      {displayCards.map((card) => {
                        const qtyInDeck = getCardQuantityInDeck(card.id);
                        const collectionQty = collectionQuantities[card.id] || 0;
                        const remaining = collectionQty - qtyInDeck;
                        return (
                          <div
                            key={card.id}
                            className="relative cursor-pointer group"
                            onClick={() => addCardToDeck(card.id, card.name)}
                          >
                            {card.imageSmall ? (
                              <img
                                src={card.imageSmall}
                                alt={card.name}
                                className={`w-full rounded transition hover:scale-105 ${
                                  qtyInDeck > 0
                                    ? 'ring-2 ring-indigo-500'
                                    : 'hover:ring-2 hover:ring-green-500'
                                }`}
                              />
                            ) : (
                              <div className={`w-full aspect-[2.5/3.5] rounded bg-slate-700 flex items-center justify-center ${
                                qtyInDeck > 0 ? 'ring-2 ring-indigo-500' : ''
                              }`}>
                                <span className="text-slate-400 text-xs text-center px-1">{card.name}</span>
                              </div>
                            )}
                            {/* Deck quantity badge */}
                            {qtyInDeck > 0 && (
                              <div className="absolute top-1 right-1 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {qtyInDeck}
                              </div>
                            )}
                            {/* Collection remaining badge (only in limited mode) */}
                            {cardSource === 'collections' && respectCollectionQty && collectionQty > 0 && (
                              <div className="absolute top-1 left-1 bg-amber-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {remaining} left
                              </div>
                            )}
                            {/* Card name on hover */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition rounded-b">
                              {card.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Pagination */}
              {(() => {
                const totalPages = Math.ceil(totalCards / CARDS_PER_PAGE);
                const currentPage = cardSource === 'all' ? cardPage : collectionPage;
                const goToPrev = () => {
                  if (cardSource === 'all') {
                    fetchAllCards(cardPage - 1, false);
                  } else {
                    const p = collectionPage - 1;
                    setCollectionPage(p);
                    setAllCards(collectionAllCards.slice((p - 1) * CARDS_PER_PAGE, p * CARDS_PER_PAGE));
                  }
                };
                const goToNext = () => {
                  if (cardSource === 'all') {
                    fetchAllCards(cardPage + 1, false);
                  } else {
                    const p = collectionPage + 1;
                    setCollectionPage(p);
                    setAllCards(collectionAllCards.slice((p - 1) * CARDS_PER_PAGE, p * CARDS_PER_PAGE));
                  }
                };
                return (
                  <div className="mt-2 flex flex-col items-center gap-1 flex-shrink-0">
                    <p className="text-slate-500 text-xs">
                      {totalCards} cards{cardSource === 'collections' && ' in collections'}
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={goToPrev}
                          disabled={currentPage <= 1 || loadingMore}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition text-sm"
                        >
                          ← Prev
                        </button>
                        <span className="text-slate-400 text-sm min-w-[70px] text-center">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={goToNext}
                          disabled={currentPage >= totalPages || loadingMore}
                          className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg transition text-sm"
                        >
                          {loadingMore ? '...' : 'Next →'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Panel - Deck Contents */}
          <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
            <div className="bg-slate-800 rounded-lg p-3 flex flex-col h-full min-h-0">
              <h2 className="text-sm font-bold text-slate-100 mb-2 flex-shrink-0">
                Deck Contents
                <span className="text-slate-400 font-normal ml-2">({getTotalCards()} / 60)</span>
              </h2>

              {deck.cards.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p>Your deck is empty</p>
                  <p className="text-sm">Click cards on the left to add them</p>
                </div>
              ) : (() => {
                const colors: Record<string, string> = {
                  'Pokémon': 'text-purple-400',
                  'Trainer': 'text-blue-400',
                  'Energy': 'text-yellow-400',
                };
                const visibleTypes = (['Pokémon', 'Trainer', 'Energy'] as const).filter(
                  t => (groupedDeckCards?.[t]?.length ?? 0) > 0
                );
                return (
                  <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                    {visibleTypes.flatMap((type, idx) => {
                      const reverseIdx = visibleTypes.length - 1 - idx;
                      const cards = groupedDeckCards![type];
                      const total = cards.reduce((s, dc) => s + dc.quantity, 0);
                      return [
                        <div
                          key={`h-${type}`}
                          onClick={() => toggleSection(type)}
                          className={`sticky z-10 flex items-center gap-2 py-1.5 px-2 bg-slate-800 cursor-pointer hover:bg-slate-700 transition ${colors[type]} font-semibold text-sm`}
                          style={{
                            top: `${idx * HEADER_H}px`,
                            bottom: `${reverseIdx * HEADER_H}px`,
                          }}
                        >
                          <span>{collapsed[type] ? '▶' : '▼'}</span>
                          <span>{type}</span>
                          <span className="text-slate-500 font-normal">({total})</span>
                        </div>,
                        ...(!collapsed[type] ? cards.map(dc => (
                          <DeckCardRow key={dc.id} deckCard={dc} onUpdateQuantity={updateCardQuantity} />
                        )) : []),
                      ];
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>


      {/* Collection Picker Modal */}
      {showCollectionPicker && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 w-full max-w-md"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
          >
            <h3 className="text-xl font-bold text-slate-100 mb-2">Filter by Collection</h3>
            <p className="text-slate-400 text-sm mb-4">
              Select which collections to show cards from:
            </p>

            {collections.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>You don't have any collections yet.</p>
                <Link
                  to="/collection"
                  className="text-indigo-400 hover:underline mt-2 inline-block"
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
                        ? 'bg-indigo-600'
                        : 'bg-slate-700 hover:bg-slate-600'
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
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
              >
                Clear
              </button>
              <button
                onClick={() => setShowCollectionPicker(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
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
}: {
  deckCard: DeckCard;
  onUpdateQuantity: (cardId: string, quantity: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-slate-600 transition">
      <img
        src={deckCard.card.imageSmall}
        alt={deckCard.card.name}
        className="w-7 h-9 object-cover rounded flex-shrink-0"
      />
      <span className="text-white text-xs flex-1 truncate min-w-0 leading-tight">
        {deckCard.card.name}
      </span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onUpdateQuantity(deckCard.cardId, deckCard.quantity - 1)}
          className="bg-red-600 hover:bg-red-700 text-white w-5 h-5 rounded text-xs flex items-center justify-center leading-none"
        >
          −
        </button>
        <span className="text-white text-xs font-bold w-4 text-center">
          {deckCard.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(deckCard.cardId, deckCard.quantity + 1)}
          className="bg-green-600 hover:bg-green-700 text-white w-5 h-5 rounded text-xs flex items-center justify-center leading-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
