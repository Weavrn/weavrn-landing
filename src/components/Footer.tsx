'use client';

import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✓ Thank you for subscribing!');
        setEmail('');
      } else {
        setMessage(data.error || 'Subscription failed');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error('Subscribe error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Weavrn</h3>
            <p className="text-gray-400">Building the future of distributed computing.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#mining" className="hover:text-white">Mining</a></li>
              <li><a href="#rewards" className="hover:text-white">Rewards</a></li>
              <li><a href="#tokenomics" className="hover:text-white">Tokenomics</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">Discord</a></li>
              <li><a href="#" className="hover:text-white">Twitter</a></li>
              <li><a href="#" className="hover:text-white">GitHub</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Subscribe</h4>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-semibold transition"
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
              {message && (
                <p className={`text-sm ${message.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Weavrn. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
