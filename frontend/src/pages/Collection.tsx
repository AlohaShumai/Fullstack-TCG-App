import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Card {
  id: string;
  name: string;
  supertype: string;
  types: string[];
  imageSmall: string;
}

interface CollectionCard {
  id: string;
  cardId: string;
  quantity: number;
  card: Card;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  _count?: { cards: number };
  cards?: CollectionCard[];
}

interface Deck {
  id: string;
  name: string;
  format: string;
}

interface Stats {
  totalCards: number;
  uniqueCards: number;
  byType: Record<string, number>;
}

export default function CollectionPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(false);
  
  // Add to Deck state
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [pendingCard, setPendingCard] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
      if (response.data.length > 0) {
        selectCollection(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const selectCollection = async (collectionId: string) => {
    try {
      const response = await api.get(`/collections/${collectionId}`);
      setSelectedCollection(response.data);
      fetchStats(collectionId);
    } catch (error) {
      console.error('Failed to fetch collection:', error);
    }
  };

  const fetchStats = async (collectionId: string) => {
    try {
      const response = await api.get(`/collections/${collectionId}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const response = await api.post('/collections', {
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || null,
        isPublic: newCollectionPublic,
      });
      setCollections([response.data, ...collections]);
      setSelectedCollection(response.data);
      setShowCreateModal(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setNewCollectionPublic(false);
      fetchCollections();
      showNotification('Collection created!');
    } catch (error) {
      console.error('Failed to create collection:', error);
      showNotification('Failed to create collection', true);
    }
  };

  const updateCollection = async () => {
    if (!selectedCollection || !newCollectionName.trim()) return;
    try {
      await api.patch(`/collections/${selectedCollection.id}`, {
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || null,
        isPublic: newCollectionPublic,
      });
      setShowEditModal(false);
      fetchCollections();
      selectCollection(selectedCollection.id);
      showNotification('Collection updated!');
    } catch (error) {
      console.error('Failed to update collection:', error);
      showNotification('Failed to update collection', true);
    }
  };

  const deleteCollection = async () => {
    if (!selectedCollection) return;
    if (!confirm(`Are you sure you want to delete "${selectedCollection.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/collections/${selectedCollection.id}`);
      setSelectedCollection(null);
      setStats(null);
      fetchCollections();
      showNotification('Collection deleted');
    } catch (error) {
      console.error('Failed to delete collection:', error);
      showNotification('Failed to delete collection', true);
    }
  };

  const updateQuantity = async (cardId: string, quantity: number) => {
    if (!selectedCollection) return;
    try {
      if (quantity <= 0) {
        await api.delete(`/collections/${selectedCollection.id}/cards/${cardId}`);
      } else {
        await api.patch(`/collections/${selectedCollection.id}/cards/${cardId}`, { quantity });
      }
      selectCollection(selectedCollection.id);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const openEditModal = () => {
    if (!selectedCollection) return;
    setNewCollectionName(selectedCollection.name);
    setNewCollectionDesc(selectedCollection.description || '');
    setNewCollectionPublic(selectedCollection.isPublic);
    setShowEditModal(true);
  };

  const showNotification = (msg: string, error = false) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(''), 2500);
  };

  // Add to Deck functions
  const openDeckPicker = async (cardId: string, cardName: string) => {
    try {
      const response = await api.get('/decks');
      if (response.data.length === 0) {
        showNotification('Create a deck first!', true);
        return;
      }
      setDecks(response.data);
      setPendingCard({ id: cardId, name: cardName });
      setShowDeckPicker(true);
    } catch (error) {
      console.error('Failed to fetch decks:', error);
      showNotification('Failed to load decks', true);
    }
  };

  const addToDeck = async (deckId: string, deckName: string) => {
    if (!pendingCard) return;
    try {
      await api.post(`/decks/${deckId}/cards`, {
        cardId: pendingCard.id,
        quantity: 1,
      });
      showNotification(`Added ${pendingCard.name} to ${deckName}!`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showNotification(error.response?.data?.message || 'Failed to add to deck', true);
    } finally {
      setShowDeckPicker(false);
      setPendingCard(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <div className="flex gap-4">
            <Link to="/cards" className="text-blue-400 hover:text-blue-300">Browse Cards</Link>
            <Link to="/decks" className="text-purple-400 hover:text-purple-300">My Decks</Link>
          </div>
        </div>
      </nav>

      {/* Notification */}
      {message && (
        <div
          className={`fixed bottom-6 left-1/2 text-white py-2 px-4 rounded-full shadow-lg z-50 flex items-center gap-2 ${
            isError ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>{isError ? '✕' : '✓'}</span>
          <span>{message}</span>
        </div>
      )}

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

      <div className="container mx-auto p-4 sm:p-8">
        {/* Collections Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">My Collections</h2>
          <button
            onClick={() => {
              setNewCollectionName('');
              setNewCollectionDesc('');
              setNewCollectionPublic(false);
              setShowCreateModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            + New Collection
          </button>
        </div>

        {/* Collection Tabs */}
        {collections.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => selectCollection(col.id)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedCollection?.id === col.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {col.name}
                {col._count && (
                  <span className="ml-2 text-xs opacity-75">({col._count.cards})</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* No Collections State */}
        {collections.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">You don't have any collections yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition"
            >
              Create Your First Collection
            </button>
          </div>
        )}

        {/* Selected Collection */}
        {selectedCollection && (
          <>
            {/* Collection Info & Actions */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedCollection.name}
                    {selectedCollection.isPublic && (
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded">Public</span>
                    )}
                  </h3>
                  {selectedCollection.description && (
                    <p className="text-gray-400 mt-1">{selectedCollection.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openEditModal}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={deleteCollection}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
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

            {/* Cards Grid */}
            {selectedCollection.cards && selectedCollection.cards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">This collection is empty.</p>
                <Link
                  to="/cards"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition"
                >
                  Browse cards to add some!
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {selectedCollection.cards?.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-2 sm:p-3 group">
                    <div className="relative">
                      <img
                        src={item.card.imageSmall}
                        alt={item.card.name}
                        className="w-full rounded mb-2"
                      />
                      {/* Add to Deck Button - shows on hover */}
                      <button
                        onClick={() => openDeckPicker(item.cardId, item.card.name)}
                        className="absolute top-2 right-2 bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                      >
                        + Deck
                      </button>
                    </div>
                    <h3 className="text-white font-semibold text-xs sm:text-sm truncate">
                      {item.card.name}
                    </h3>
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
          </>
        )}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Create New Collection</h3>
            <input
              type="text"
              placeholder="Collection Name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4 h-24 resize-none"
            />
            <label className="flex items-center text-white mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={newCollectionPublic}
                onChange={(e) => setNewCollectionPublic(e.target.checked)}
                className="mr-2 w-4 h-4"
              />
              Make this collection public
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={createCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Edit Collection</h3>
            <input
              type="text"
              placeholder="Collection Name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
            />
            <textarea
              placeholder="Description (optional)"
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none mb-4 h-24 resize-none"
            />
            <label className="flex items-center text-white mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={newCollectionPublic}
                onChange={(e) => setNewCollectionPublic(e.target.checked)}
                className="mr-2 w-4 h-4"
              />
              Make this collection public
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={updateCollection}
                disabled={!newCollectionName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deck Picker Modal */}
      {showDeckPicker && pendingCard && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            style={{ animation: 'modalSlideIn 0.25s ease-out' }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Add to Deck</h3>
            <p className="text-gray-400 mb-4">
              Select a deck to add <span className="text-white font-semibold">{pendingCard.name}</span> to:
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => addToDeck(deck.id, deck.name)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-left"
                >
                  <span className="text-white">{deck.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    deck.format === 'standard' 
                      ? 'bg-green-600 text-green-100' 
                      : 'bg-blue-600 text-blue-100'
                  }`}>
                    {deck.format === 'standard' ? 'Standard' : 'Unlimited'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeckPicker(false);
                  setPendingCard(null);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <Link
                to="/decks"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition text-center"
              >
                Create New Deck
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
