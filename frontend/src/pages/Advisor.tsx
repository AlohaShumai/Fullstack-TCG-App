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

  const getAdvice = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setError('');
    setAdvice(null);

    try {
      const response = await api.get(`/rag/advice?question=${encodeURIComponent(question)}`);
      setAdvice(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to get advice. Make sure embeddings are generated.');
    } finally {
      setLoading(false);
    }
  };

  const exampleQuestions = [
    "What fire type Pokemon should I add to my deck?",
    "How can I counter water decks?",
    "What trainer cards help with card draw?",
    "Build me a beginner-friendly deck",
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link to="/" className="text-2xl font-bold text-white">TCG App</Link>
          <Link to="/decks" className="text-purple-400 hover:text-purple-300">My Decks</Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Deck Advisor</h2>

        {/* Info Box */}
        <div className="bg-blue-900 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-300 mb-2">🤖 AI-Powered Advice</h3>
          <p className="text-blue-100 text-sm sm:text-base">
            Ask questions about deck building, card strategies, or type matchups. 
            The advisor uses your card collection and AI to provide personalized recommendations.
          </p>
        </div>

        {/* Question Input */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6">
          <label className="block text-white font-bold mb-2">Ask a Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What cards should I add to counter water type decks?"
            className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-yellow-500 focus:outline-none resize-none h-24 sm:h-32"
          />
          <button
            onClick={getAdvice}
            disabled={loading || !question.trim()}
            className="w-full sm:w-auto mt-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition font-bold"
          >
            {loading ? 'Thinking...' : 'Get Advice'}
          </button>
        </div>

        {/* Example Questions */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-300 mb-3">Example Questions</h3>
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-3 py-2 rounded transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 rounded-lg p-4 sm:p-6 mb-6">
            <p className="text-red-300">{error}</p>
            <p className="text-red-400 text-sm mt-2">
              Make sure you've run POST /rag/embed to generate card embeddings first.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-gray-800 rounded-lg p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <p className="text-yellow-400">Analyzing cards and generating advice...</p>
            </div>
          </div>
        )}

        {/* Advice Response */}
        {advice && (
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">💡 Recommendation</h3>
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-white whitespace-pre-wrap">{advice.answer}</p>
            </div>
            
            {advice.relevantCards && advice.relevantCards.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-gray-300 mb-2">Related Cards</h4>
                <div className="flex flex-wrap gap-2">
                  {advice.relevantCards.map((card, i) => (
                    <span key={i} className="bg-yellow-900 text-yellow-300 px-3 py-1 rounded text-sm">
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-300 mb-3">⚙️ Setup Required</h3>
          <p className="text-gray-400 text-sm mb-2">For the advisor to work, you need:</p>
          <ol className="text-gray-400 text-sm list-decimal list-inside space-y-1">
            <li>OpenAI API key in your backend .env file</li>
            <li>Run POST /rag/embed to generate card embeddings</li>
            <li>Have cards synced in your database</li>
          </ol>
        </div>
      </div>
    </div>
  );
}