import { useState, useEffect, useRef, type MouseEvent } from 'react';
import api from '../services/api';

interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text: string;
}

interface Ability {
  name: string;
  text: string;
  type: string;
}

interface Legalities {
  standard?: string;
  expanded?: string;
  unlimited?: string;
}

interface Card {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  types: string[];
  hp: string | null;
  imageSmall: string;
  imageLarge: string;
  setName: string;
  setId: string;
  attacks: Attack[] | null;
  abilities: Ability[] | null;
  weaknesses: { type: string; value: string }[] | null;
  resistances: { type: string; value: string }[] | null;
  retreatCost: string[];
  rules: string[];
  legalities: Legalities | null;
}

interface SetWithLegality {
  id: string;
  name: string;
  standardLegal: boolean;
  expandedLegal: boolean;
}

interface RotationInfo {
  currentSeason: string;
  lastRotationDate: string;
  nextRotationExpected: string;
  source: string;
  standardLegalSets: string[];
}

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [supertypeFilter, setSupertypeFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [allSets, setAllSets] = useState<SetWithLegality[]>([]);
  const [rotationInfo, setRotationInfo] = useState<RotationInfo | null>(null);
  const [showRotationInfo, setShowRotationInfo] = useState(false);

  // Collection picker state
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [pendingCard, setPendingCard] = useState<{ id: string; name: string } | null>(null);
  const [isErrorMessage, setIsErrorMessage] = useState(false);

  const types = [
    'Fire',
    'Water',
    'Grass',
    'Lightning',
    'Psychic',
    'Fighting',
    'Darkness',
    'Metal',
    'Dragon',
    'Fairy',
    'Colorless',
  ];
  const supertypes = ['Pokémon', 'Trainer', 'Energy'];

  useEffect(() => {
    fetchSets();
    fetchRotationInfo();
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  useEffect(() => {
    fetchCards(1, debouncedSearch, typeFilter, supertypeFilter, setFilter, formatFilter);
  }, [debouncedSearch, typeFilter, supertypeFilter, setFilter, formatFilter]);

  const fetchSets = async () => {
    try {
      const response = await api.get('/cards/sets');
      setAllSets(response.data);
    } catch {
      // non-critical — filter just won't populate
    }
  };

  const fetchRotationInfo = async () => {
    try {
      const response = await api.get('/cards/rotation');
      setRotationInfo(response.data);
    } catch {
      // non-critical — rotation info banner just won't show
    }
  };

  const fetchCards = async (
    pageNum: number = 1,
    searchVal?: string,
    typeVal?: string,
    supertypeVal?: string,
    setVal?: string,
    formatVal?: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pageNum.toString());
      params.append('limit', '20');
      if (searchVal) params.append('search', searchVal);
      if (typeVal) params.append('type', typeVal);
      if (supertypeVal) params.append('supertype', supertypeVal);
      if (setVal) params.append('set', setVal);
      if (formatVal) params.append('format', formatVal);

      const response = await api.get(`/cards?${params.toString()}`);
      setCards(response.data.data || []);
      setTotalPages(response.data.meta?.totalPages || 1);
      setTotal(response.data.meta?.total || 0);
      setPage(response.data.meta?.page || 1);
    } catch {
      showNotification('Failed to load cards', true);
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (
    cardId: string,
    cardName: string,
    e?: MouseEvent
  ) => {
    if (e) e.stopPropagation();
    try {
      // Get user's collections
      const collectionsRes = await api.get('/collections');

      if (collectionsRes.data.length === 0) {
        // No collections exist, prompt user to create one
        setPendingCard({ id: cardId, name: cardName });
        setCollections([]);
        setSelectedCard(null);
        setShowCollectionPicker(true);
      } else if (collectionsRes.data.length === 1) {
        // Only one collection, add directly
        await api.post(`/collections/${collectionsRes.data[0].id}/cards`, {
          cardId,
          quantity: 1,
        });
        setSelectedCard(null);
        showNotification(`Added ${cardName} to ${collectionsRes.data[0].name}!`);
      } else {
        // Multiple collections, show picker
        setCollections(collectionsRes.data);
        setPendingCard({ id: cardId, name: cardName });
        setSelectedCard(null);
        setShowCollectionPicker(true);
      }
    } catch {
      showNotification('Failed to add card', true);
    }
  };

  const showNotification = (msg: string, isError = false) => {
    setMessage(msg);
    setIsErrorMessage(isError);
    setTimeout(() => setMessage(''), isError ? 5000 : 2500);
  };

  const addToSelectedCollections = async (collectionIds: string[], quantities: Record<string, number>) => {
    if (!pendingCard || collectionIds.length === 0) return;

    try {
      // Add card to all selected collections
      await Promise.all(
        collectionIds.map((colId) =>
          api.post(`/collections/${colId}/cards`, {
            cardId: pendingCard.id,
            quantity: quantities[colId] ?? 1,
          })
        )
      );

      const collectionNames = collections
        .filter((c) => collectionIds.includes(c.id))
        .map((c) => c.name)
        .join(', ');

      showNotification(`Added ${pendingCard.name} to ${collectionNames}!`);
    } catch {
      showNotification('Failed to add card', true);
    } finally {
      setShowCollectionPicker(false);
      setPendingCard(null);
    }
  };

  const createCollectionAndAdd = async (name: string) => {
    if (!pendingCard || !name.trim()) return;

    try {
      const newCollection = await api.post('/collections', {
        name: name.trim(),
        isPublic: false,
      });

      await api.post(`/collections/${newCollection.data.id}/cards`, {
        cardId: pendingCard.id,
        quantity: 1,
      });

      showNotification(`Created "${name}" and added ${pendingCard.name}!`);
    } catch {
      showNotification('Failed to create collection', true);
    } finally {
      setShowCollectionPicker(false);
      setPendingCard(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setTypeFilter('');
    setSupertypeFilter('');
    setSetFilter('');
    setFormatFilter('');
  };

  const isStandardLegal = (card: Card) => {
    return card.legalities?.standard === 'Legal';
  };

  const isExpandedLegal = (card: Card) => {
    return card.legalities?.expanded === 'Legal';
  };

  const filteredSets =
    formatFilter === 'standard'
      ? allSets.filter((set) => set.standardLegal)
      : allSets;

  if (loading && cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-100 text-xl">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2">
        <button
          onClick={() => setShowRotationInfo(!showRotationInfo)}
          className="text-yellow-400 hover:text-yellow-300 text-sm"
        >
          📋 Rotation Info
        </button>
      </div>

      {message && (
        <div
          className={`fixed bottom-6 left-1/2 text-white text-center py-3 px-5 rounded-full shadow-xl z-50 flex items-center gap-2 ${
            isErrorMessage ? 'bg-red-700' : 'bg-green-700'
          }`}
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>{isErrorMessage ? '✕' : '✓'}</span>
          <span>{message}</span>
        </div>
      )}
      {showRotationInfo && rotationInfo && (
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="container mx-auto p-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-yellow-400">
                Standard Format Rotation
              </h3>
              <button
                onClick={() => setShowRotationInfo(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">
                  Current Season:{' '}
                  <span className="text-slate-100">{rotationInfo.currentSeason}</span>
                </p>
                <p className="text-slate-400 text-sm">
                  Last Rotation:{' '}
                  <span className="text-slate-100">{rotationInfo.lastRotationDate}</span>
                </p>
                <p className="text-slate-400 text-sm">
                  Next Rotation:{' '}
                  <span className="text-slate-100">
                    {rotationInfo.nextRotationExpected}
                  </span>
                </p>
                <a
                  href={rotationInfo.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline text-sm"
                >
                  Official Pokemon TCG Rules →
                </a>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-2">Standard Legal Sets:</p>
                <div className="flex flex-wrap gap-1">
                  {rotationInfo.standardLegalSets.map((set) => (
                    <span
                      key={set}
                      className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded"
                    >
                      {set}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-6">
          Browse Cards
        </h2>

        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-3 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            />

            <select
              value={formatFilter}
              onChange={(e) => {
                setFormatFilter(e.target.value);
                setSetFilter('');
              }}
              className="p-3 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Formats</option>
              <option value="standard">Standard Legal Only</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-3 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={supertypeFilter}
              onChange={(e) => setSupertypeFilter(e.target.value)}
              className="p-3 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Supertypes</option>
              {supertypes.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="p-3 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Sets</option>
              {filteredSets.map((set) => (
                <option key={set.id} value={set.name}>
                  {set.name} {set.standardLegal ? '✓' : '✗'}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="p-3 rounded bg-red-600 hover:bg-red-700 text-white transition"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <p className="text-slate-400 text-sm">
              Showing {cards.length} of {total} cards (Page {page} of {totalPages})
              {formatFilter === 'standard' && (
                <span className="text-green-400 ml-2">• Standard Legal Only</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  fetchCards(
                    page - 1,
                    search,
                    typeFilter,
                    supertypeFilter,
                    setFilter,
                    formatFilter
                  )
                }
                disabled={page <= 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  fetchCards(
                    page + 1,
                    search,
                    typeFilter,
                    supertypeFilter,
                    setFilter,
                    formatFilter
                  )
                }
                disabled={page >= totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="bg-slate-800 rounded-lg p-2 sm:p-3 hover:bg-slate-700 transition cursor-pointer relative"
            >
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {isStandardLegal(card) ? (
                  <span className="bg-green-900 text-green-300 text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                    ✓ Legal
                  </span>
                ) : (
                  <span className="bg-red-900 text-red-400 text-xs px-1.5 py-0.5 rounded flex items-center gap-1 opacity-75">
                    ✗ Not Legal
                  </span>
                )}
              </div>

              <img
                src={card.imageSmall}
                alt={card.name}
                className="w-full rounded mb-2"
                onError={(e) => { (e.target as HTMLImageElement).src = '/card-placeholder.svg'; }}
              />
              <h3 className="text-slate-100 font-semibold text-xs sm:text-sm truncate">
                {card.name}
              </h3>
              <p className="text-slate-400 text-xs mb-2">{card.setName}</p>
              <button
                onClick={(e) => addToCollection(card.id, card.name, e)}
                className="w-full bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm py-1 rounded transition"
              >
                + Add
              </button>
            </div>
          ))}
        </div>

        {cards.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              No cards found matching your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 text-indigo-400 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto z-50"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
          onClick={() => setSelectedCard(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="bg-slate-800 rounded-lg max-w-4xl w-full"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">
                    {selectedCard.name}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    {isStandardLegal(selectedCard) ? (
                      <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                        ✓ Standard Legal
                      </span>
                    ) : (
                      <span className="bg-red-900 text-red-400 text-xs px-2 py-1 rounded opacity-75">
                        ✗ Not Standard Legal
                      </span>
                    )}
                    {isExpandedLegal(selectedCard) && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                        Expanded Legal
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-slate-400 hover:text-slate-100 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedCard.imageLarge}
                    alt={selectedCard.name}
                    className="w-full rounded-lg"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/card-placeholder.svg'; }}
                  />
                  <button
                    onClick={() =>
                      addToCollection(selectedCard.id, selectedCard.name)
                    }
                    className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg transition font-bold"
                  >
                    + Add to Collection
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-indigo-400 mb-2">
                      Basic Info
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-400">Supertype:</p>
                      <p className="text-slate-100">{selectedCard.supertype}</p>

                      {selectedCard.subtypes?.length > 0 && (
                        <>
                          <p className="text-slate-400">Subtypes:</p>
                          <p className="text-slate-100">
                            {selectedCard.subtypes.join(', ')}
                          </p>
                        </>
                      )}

                      {selectedCard.hp && (
                        <>
                          <p className="text-slate-400">HP:</p>
                          <p className="text-slate-100">{selectedCard.hp}</p>
                        </>
                      )}

                      {selectedCard.types?.length > 0 && (
                        <>
                          <p className="text-slate-400">Type:</p>
                          <p className="text-slate-100">
                            {selectedCard.types.join(', ')}
                          </p>
                        </>
                      )}

                      <p className="text-slate-400">Set:</p>
                      <p className="text-slate-100">{selectedCard.setName}</p>
                    </div>
                  </div>

                  <div className="bg-slate-700 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-indigo-400 mb-2">
                      Format Legality
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-400">Standard:</p>
                      <p
                        className={
                          isStandardLegal(selectedCard)
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {isStandardLegal(selectedCard)
                          ? '✓ Legal'
                          : '✗ Not Legal (Rotated)'}
                      </p>
                      <p className="text-slate-400">Expanded:</p>
                      <p
                        className={
                          isExpandedLegal(selectedCard)
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {isExpandedLegal(selectedCard)
                          ? '✓ Legal'
                          : '✗ Not Legal'}
                      </p>
                      <p className="text-slate-400">Unlimited:</p>
                      <p className="text-green-400">✓ Legal</p>
                    </div>
                  </div>

                  {selectedCard.abilities && selectedCard.abilities.length > 0 && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-violet-400 mb-2">
                        Abilities
                      </h3>
                      {selectedCard.abilities.map((ability: Ability, i: number) => (
                        <div key={i} className="mb-3">
                          <p className="text-slate-100 font-semibold">{ability.name}</p>
                          <p className="text-slate-300 text-sm">{ability.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCard.attacks && selectedCard.attacks.length > 0 && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-red-400 mb-2">
                        Attacks
                      </h3>
                      {selectedCard.attacks.map((attack: Attack, i: number) => (
                        <div key={i} className="mb-3">
                          <div className="flex justify-between items-center">
                            <p className="text-slate-100 font-semibold">
                              {attack.name}
                            </p>
                            {attack.damage && (
                              <p className="text-yellow-400 font-bold">
                                {attack.damage}
                              </p>
                            )}
                          </div>
                          {attack.cost?.length > 0 && (
                            <p className="text-slate-400 text-xs">
                              Cost: {attack.cost.join(', ')}
                            </p>
                          )}
                          {attack.text && (
                            <p className="text-slate-300 text-sm mt-1">
                              {attack.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {(selectedCard.weaknesses ||
                    selectedCard.resistances ||
                    (selectedCard.retreatCost &&
                      selectedCard.retreatCost.length > 0)) && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-yellow-400 mb-2">
                        Combat Info
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedCard.weaknesses && (
                          <>
                            <p className="text-slate-400">Weakness:</p>
                            <p className="text-slate-100">
                              {selectedCard.weaknesses
                                .map(
                                  (w: { type: string; value: string }) =>
                                    `${w.type} ${w.value}`
                                )
                                .join(', ')}
                            </p>
                          </>
                        )}
                        {selectedCard.resistances && (
                          <>
                            <p className="text-slate-400">Resistance:</p>
                            <p className="text-slate-100">
                              {selectedCard.resistances
                                .map(
                                  (r: { type: string; value: string }) =>
                                    `${r.type} ${r.value}`
                                )
                                .join(', ')}
                            </p>
                          </>
                        )}
                        {selectedCard.retreatCost &&
                          selectedCard.retreatCost.length > 0 && (
                            <>
                              <p className="text-slate-400">Retreat Cost:</p>
                              <p className="text-slate-100">
                                {selectedCard.retreatCost.length}
                              </p>
                            </>
                          )}
                      </div>
                    </div>
                  )}

                  {selectedCard.rules && selectedCard.rules.length > 0 && (
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-green-400 mb-2">
                        Rules
                      </h3>
                      {selectedCard.rules.map((rule: string, i: number) => (
                        <p key={i} className="text-slate-300 text-sm mb-2">
                          {rule}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Collection Picker Modal */}
      {showCollectionPicker && pendingCard && (
        <CollectionPickerModal
          collections={collections}
          cardName={pendingCard.name}
          onSelect={addToSelectedCollections}
          onCreate={createCollectionAndAdd}
          onClose={() => {
            setShowCollectionPicker(false);
            setPendingCard(null);
          }}
        />
      )}
    </div>
  );
}

// Collection Picker Modal Component
function CollectionPickerModal({
  collections,
  cardName,
  onSelect,
  onCreate,
  onClose,
}: {
  collections: { id: string; name: string }[];
  cardName: string;
  onSelect: (collectionIds: string[], quantities: Record<string, number>) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showCreateForm, setShowCreateForm] = useState(collections.length === 0);
  const [newName, setNewName] = useState('');

  const toggleCollection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    setQuantities((prev) => ({ ...prev, [id]: prev[id] ?? 1 }));
  };

  const changeQuantity = (id: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }));
  };

  const selectAll = () => {
    setSelectedIds(collections.map((c) => c.id));
    setQuantities((prev) => {
      const next = { ...prev };
      collections.forEach((c) => { if (!next[c.id]) next[c.id] = 1; });
      return next;
    });
  };

  // If no collections, show create form
  if (showCreateForm || collections.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        <div
          className="bg-slate-800 rounded-lg p-6 w-full max-w-md"
          style={{ animation: 'modalSlideIn 0.25s ease-out' }}
        >
          <h3 className="text-xl font-bold text-slate-100 mb-2">Create a Collection</h3>
          <p className="text-slate-400 mb-4">
            {collections.length === 0
              ? `Create a collection to add ${cardName} to:`
              : `Create a new collection for ${cardName}:`
            }
          </p>

          <input
            type="text"
            placeholder="Collection name (e.g., Trade Binder)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && newName.trim() && onCreate(newName)}
            className="w-full p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none mb-4"
            autoFocus
          />

          <div className="flex gap-2">
            {collections.length > 0 && (
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onCreate(newName)}
              disabled={!newName.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
            >
              Create & Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div
        className="bg-slate-800 rounded-lg p-6 w-full max-w-md"
        style={{ animation: 'modalSlideIn 0.25s ease-out' }}
      >
        <h3 className="text-xl font-bold text-slate-100 mb-2">Add to Collection</h3>
        <p className="text-slate-400 mb-4">
          Select which collection(s) to add <span className="text-slate-100 font-semibold">{cardName}</span> to:
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {collections.map((col) => {
            const isSelected = selectedIds.includes(col.id);
            const qty = quantities[col.id] ?? 1;
            return (
              <div
                key={col.id}
                className={`flex items-center p-3 rounded-lg transition ${
                  isSelected ? 'bg-indigo-700' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCollection(col.id)}
                  className="mr-3 w-4 h-4 cursor-pointer"
                />
                <span
                  className="text-white flex-1 cursor-pointer"
                  onClick={() => toggleCollection(col.id)}
                >
                  {col.name}
                </span>
                {isSelected && (
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); changeQuantity(col.id, -1); }}
                      className="w-6 h-6 bg-indigo-900 hover:bg-indigo-800 text-white rounded text-sm font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-white font-bold w-5 text-center">{qty}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); changeQuantity(col.id, 1); }}
                      className="w-6 h-6 bg-indigo-900 hover:bg-indigo-800 text-white rounded text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full mb-4 p-2 rounded-lg border-2 border-dashed border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition"
        >
          + Create New Collection
        </button>

        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
          >
            Select All
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSelect(selectedIds, quantities)}
            disabled={selectedIds.length === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
