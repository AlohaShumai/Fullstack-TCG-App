import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
}

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [supertypeFilter, setSupertypeFilter] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const types = ['Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Fairy', 'Colorless'];
  const supertypes = ['Pokémon', 'Trainer', 'Energy'];

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

  const addToCollection = async (cardId: string, cardName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const uniqueSets = [...new Set(cards.map(card => card.setName))].sort();

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || (card.types && card.types.includes(typeFilter));
    const matchesSupertype = !supertypeFilter || card.supertype === supertypeFilter;
    const matchesSet = !setFilter || card.setName === setFilter;
    return matchesSearch && matchesType && matchesSupertype && matchesSet;
  });

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setSupertypeFilter('');
    setSetFilter('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/collection" className="text-green-400 hover:text-green-300">My Collection</Link>
        </div>
      </nav>

      {message && (
        <div className="bg-green-600 text-white text-center py-2">
          {message}
        </div>
      )}

      <div className="container mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Browse Cards</h2>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={supertypeFilter}
              onChange={(e) => setSupertypeFilter(e.target.value)}
              className="p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Supertypes</option>
              {supertypes.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Sets</option>
              {uniqueSets.map(set => (
                <option key={set} value={set}>{set}</option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="p-3 rounded bg-red-600 hover:bg-red-700 text-white transition"
            >
              Clear Filters
            </button>
          </div>

          <p className="text-gray-400 mt-4 text-sm">
            Showing {filteredCards.length} of {cards.length} cards
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredCards.map(card => (
            <div
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="bg-gray-800 rounded-lg p-2 sm:p-3 hover:bg-gray-700 transition cursor-pointer"
            >
              <img
                src={card.imageSmall}
                alt={card.name}
                className="w-full rounded mb-2"
              />
              <h3 className="text-white font-semibold text-xs sm:text-sm truncate">{card.name}</h3>
              <p className="text-gray-400 text-xs mb-2">{card.setName}</p>
              <button
                onClick={(e) => addToCollection(card.id, card.name, e)}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm py-1 rounded transition"
              >
                + Add
              </button>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No cards found matching your filters.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-400 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedCard.name}</h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div>
                  <img
                    src={selectedCard.imageLarge}
                    alt={selectedCard.name}
                    className="w-full rounded-lg"
                  />
                  <button
                    onClick={() => addToCollection(selectedCard.id, selectedCard.name)}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition font-bold"
                  >
                    + Add to Collection
                  </button>
                </div>

                {/* Card Details */}
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-blue-400 mb-2">Basic Info</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-gray-400">Supertype:</p>
                      <p className="text-white">{selectedCard.supertype}</p>
                      
                      {selectedCard.subtypes?.length > 0 && (
                        <>
                          <p className="text-gray-400">Subtypes:</p>
                          <p className="text-white">{selectedCard.subtypes.join(', ')}</p>
                        </>
                      )}
                      
                      {selectedCard.hp && (
                        <>
                          <p className="text-gray-400">HP:</p>
                          <p className="text-white">{selectedCard.hp}</p>
                        </>
                      )}
                      
                      {selectedCard.types?.length > 0 && (
                        <>
                          <p className="text-gray-400">Type:</p>
                          <p className="text-white">{selectedCard.types.join(', ')}</p>
                        </>
                      )}
                      
                      <p className="text-gray-400">Set:</p>
                      <p className="text-white">{selectedCard.setName}</p>
                    </div>
                  </div>

                  {/* Abilities */}
                  {selectedCard.abilities && selectedCard.abilities.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-purple-400 mb-2">Abilities</h3>
                      {selectedCard.abilities.map((ability, i) => (
                        <div key={i} className="mb-3">
                          <p className="text-white font-semibold">{ability.name}</p>
                          <p className="text-gray-300 text-sm">{ability.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attacks */}
                  {selectedCard.attacks && selectedCard.attacks.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-red-400 mb-2">Attacks</h3>
                      {selectedCard.attacks.map((attack, i) => (
                        <div key={i} className="mb-3">
                          <div className="flex justify-between items-center">
                            <p className="text-white font-semibold">{attack.name}</p>
                            {attack.damage && (
                              <p className="text-yellow-400 font-bold">{attack.damage}</p>
                            )}
                          </div>
                          {attack.cost?.length > 0 && (
                            <p className="text-gray-400 text-xs">Cost: {attack.cost.join(', ')}</p>
                          )}
                          {attack.text && (
                            <p className="text-gray-300 text-sm mt-1">{attack.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Weaknesses & Resistances */}
                  {(selectedCard.weaknesses || selectedCard.resistances || selectedCard.retreatCost?.length > 0) && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-yellow-400 mb-2">Combat Info</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedCard.weaknesses && (
                          <>
                            <p className="text-gray-400">Weakness:</p>
                            <p className="text-white">
                              {selectedCard.weaknesses.map(w => `${w.type} ${w.value}`).join(', ')}
                            </p>
                          </>
                        )}
                        {selectedCard.resistances && (
                          <>
                            <p className="text-gray-400">Resistance:</p>
                            <p className="text-white">
                              {selectedCard.resistances.map(r => `${r.type} ${r.value}`).join(', ')}
                            </p>
                          </>
                        )}
                        {selectedCard.retreatCost?.length > 0 && (
                          <>
                            <p className="text-gray-400">Retreat Cost:</p>
                            <p className="text-white">{selectedCard.retreatCost.length}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {selectedCard.rules && selectedCard.rules.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-bold text-green-400 mb-2">Rules</h3>
                      {selectedCard.rules.map((rule, i) => (
                        <p key={i} className="text-gray-300 text-sm mb-2">{rule}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}