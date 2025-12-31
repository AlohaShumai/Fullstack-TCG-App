import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface AdviceResponse {
  answer: string;
  relevantCards: string[];
}

export default function Advisor() {
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const askAdvice = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setAdvice(null);

    try {
      const response = await api.get('/rag/advice', {
        params: { question },
      });
      setAdvice(response.data);
    } catch (err) {
      setError('Failed to get advice. Make sure you have cards in your collection and embeddings are generated.');
      console.error('Advice error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
        </div>
      </nav>

      <div className="container mx-auto p-8 max-w-3xl">
        <h2 className="text-3xl font-bold text-white mb-2">Deck Advisor</h2>
        <p className="text-gray-400 mb-8">
          Ask questions about deck building based on your collection. Powered by AI.
        </p>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block text-gray-300 mb-2">Your Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What's a good Fire deck I can build? How can I counter Water types?"
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-yellow-500 focus:outline-none h-32 resize-none"
          />
          <button
            onClick={askAdvice}
            disabled={loading || !question.trim()}
            className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-3 rounded transition"
          >
            {loading ? 'Thinking...' : 'Get Advice'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {advice && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Advice</h3>
            <p className="text-white whitespace-pre-wrap mb-6">{advice.answer}</p>

            {advice.relevantCards.length > 0 && (
              <div>
                <h4 className="text-gray-400 mb-2">Cards Referenced:</h4>
                <div className="flex flex-wrap gap-2">
                  {advice.relevantCards.map((card, i) => (
                    <span key={i} className="bg-gray-700 px-3 py-1 rounded text-white text-sm">
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-400 mb-2">Tips</h3>
          <ul className="text-gray-500 text-sm space-y-1">
            <li>• Add cards to your collection first</li>
            <li>• Ask specific questions about deck types or strategies</li>
            <li>• The advisor considers only cards you own</li>
          </ul>
        </div>
      </div>
    </div>
  );
}