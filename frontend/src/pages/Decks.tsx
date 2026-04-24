// Deck list page — shows all of the user's decks, lets them create blank decks or import from a PTCGL list.
// Clicking "Edit Deck" navigates to DeckDetail which has the full card browser + deck builder UI.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  format: string;
  cards: DeckCard[];
}

export default function Decks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckFormat, setNewDeckFormat] = useState('unlimited');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notification, setNotification] = useState('');
  const [notifError, setNotifError] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importName, setImportName] = useState('');
  const [importFormat, setImportFormat] = useState('unlimited');
  const [importList, setImportList] = useState('');
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Displays a toast notification at the bottom of the screen; errors stay longer (4s vs 2.5s)
  const showNotification = (msg: string, isError = false) => {
    setNotification(msg);
    setNotifError(isError);
    setTimeout(() => setNotification(''), isError ? 4000 : 2500);
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await api.get('/decks');
      setDecks(response.data);
    } catch {
      showNotification('Failed to load decks', true);
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    try {
      await api.post('/decks', { name: newDeckName, format: newDeckFormat });
      setNewDeckName('');
      setNewDeckFormat('unlimited');
      setShowCreateForm(false);
      fetchDecks();
    } catch {
      showNotification('Failed to create deck', true);
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await api.delete(`/decks/${deckId}`);
      fetchDecks();
    } catch {
      showNotification('Failed to delete deck', true);
    }
  };

  const importDeck = async () => {
    if (!importName.trim() || !importList.trim()) return;
    setImporting(true);
    try {
      const response = await api.post('/decks/import', {
        name: importName,
        format: importFormat,
        deckList: importList,
      });
      const { deck, notFound, warnings } = response.data;
      // Merge server warnings and unresolved cards into a single warning list shown to the user
      const allWarnings = [
        ...warnings,
        ...notFound.map((c: string) => `Not found: ${c}`),
      ];
      setImportWarnings(allWarnings);
      setShowImportModal(false);
      setImportName('');
      setImportFormat('unlimited');
      setImportList('');
      if (allWarnings.length === 0) {
        showNotification('Deck imported successfully!');
      }
      navigate(`/decks/${deck.id}`);
    } catch {
      showNotification('Failed to import deck', true);
    } finally {
      setImporting(false);
    }
  };

  // Sums all card quantities in a deck for the progress bar and "X / 60" label
  const getTotalCards = (deck: Deck) => {
    return deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-100 text-xl">Loading decks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {notification && (
        <div
          className={`fixed bottom-6 left-1/2 text-white text-center py-3 px-5 rounded-full shadow-xl z-50 flex items-center gap-2 ${
            notifError ? 'bg-red-700' : 'bg-green-700'
          }`}
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>{notifError ? '✕' : '✓'}</span>
          <span>{notification}</span>
        </div>
      )}

      <div className="container mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">My Decks</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded-lg transition"
            >
              Import Deck
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition"
            >
              + New Deck
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 mb-6 border border-slate-700">
            <h3 className="text-xl font-bold text-slate-100 mb-4">Create New Deck</h3>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={newDeckFormat}
                  onChange={(e) => setNewDeckFormat(e.target.value)}
                  className="flex-1 p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="unlimited">Unlimited (Any cards)</option>
                  <option value="standard">Standard (Tournament legal)</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={createDeck}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-slate-100 px-6 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {importWarnings.length > 0 && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-yellow-300 font-semibold mb-2">Import completed with warnings:</p>
                <ul className="text-yellow-200 text-sm space-y-1">
                  {importWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
              <button
                onClick={() => setImportWarnings([])}
                className="text-yellow-400 hover:text-yellow-200 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">You don't have any decks yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg transition"
            >
              Create your first deck!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {decks.map(deck => {
              const total = getTotalCards(deck);
              const pct = Math.min((total / 60) * 100, 100);
              return (
                <div key={deck.id} className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-100">{deck.name}</h3>
                    <button
                      onClick={() => deleteDeck(deck.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mb-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      deck.format === 'standard'
                        ? 'bg-indigo-900 text-indigo-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {deck.format === 'standard' ? 'Standard' : 'Unlimited'}
                    </span>
                  </div>

                  {/* Progress bar turns green when deck reaches exactly 60 cards */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Cards</span>
                      <span className="text-slate-100">{total} / 60</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${total === 60 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-1 mb-4 overflow-hidden">
                    {deck.cards.slice(0, 5).map(deckCard => (
                      <img
                        key={deckCard.id}
                        src={deckCard.card.imageSmall}
                        alt={deckCard.card.name}
                        className="w-10 sm:w-12 h-auto rounded"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/card-placeholder.svg'; }}
                      />
                    ))}
                    {deck.cards.length > 5 && (
                      <div className="w-10 sm:w-12 h-14 sm:h-16 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs">
                        +{deck.cards.length - 5}
                      </div>
                    )}
                    {deck.cards.length === 0 && (
                      <p className="text-slate-500 text-sm">No cards yet</p>
                    )}
                  </div>

                  <Link
                    to={`/decks/${deck.id}`}
                    className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition"
                  >
                    Edit Deck
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-slate-100">Import Deck</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input
                type="text"
                placeholder="Deck name..."
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value)}
                className="p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="unlimited">Unlimited (Any cards)</option>
                <option value="standard">Standard (Tournament legal)</option>
              </select>
              <textarea
                placeholder={`Paste deck list here...\n\nPokémon: 14\n4 Charizard ex OBF 125\n...\n\nEnergy: 12\n9 Basic Fire Energy`}
                value={importList}
                onChange={(e) => setImportList(e.target.value)}
                rows={12}
                className="p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none font-mono text-sm resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={importDeck}
                  disabled={importing || !importName.trim() || !importList.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition font-semibold"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
