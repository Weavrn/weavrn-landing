'use client';

import { useState, useEffect } from 'react';
import WalletConnect from './WalletConnect';

interface MiningStats {
  totalMined: number;
  totalRewards: number;
  activeMiners: number;
  networkHashrate: string;
}

export default function MiningDashboard() {
  const [stats, setStats] = useState<MiningStats>({
    totalMined: 0,
    totalRewards: 0,
    activeMiners: 0,
    networkHashrate: '0 TH/s',
  });

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate real-time stats updates
    const interval = setInterval(() => {
      setStats((prev) => ({
        totalMined: prev.totalMined + Math.random() * 10,
        totalRewards: prev.totalRewards + Math.random() * 5,
        activeMiners: Math.floor(Math.random() * 10000) + 5000,
        networkHashrate: (Math.random() * 500 + 100).toFixed(2) + ' TH/s',
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-4 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">
          Mining Dashboard
        </h2>
        <p className="text-center text-slate-300 mb-12">
          Real-time mining and rewards statistics
        </p>

        {!isConnected ? (
          <div className="text-center mb-12">
            <WalletConnect onConnect={() => setIsConnected(true)} />
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 text-sm mb-2">Total Mined</p>
            <p className="text-3xl font-bold text-white">
              {stats.totalMined.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-2">WVRN</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 text-sm mb-2">Total Rewards</p>
            <p className="text-3xl font-bold text-blue-400">
              {stats.totalRewards.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-2">WVRN</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 text-sm mb-2">Active Miners</p>
            <p className="text-3xl font-bold text-green-400">
              {stats.activeMiners.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-2">Worldwide</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
            <p className="text-slate-400 text-sm mb-2">Network Hashrate</p>
            <p className="text-3xl font-bold text-purple-400">
              {stats.networkHashrate}
            </p>
            <p className="text-xs text-slate-500 mt-2">Current</p>
          </div>
        </div>

        {isConnected && (
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              Start Earning Rewards
            </h3>
            <p className="text-blue-100 mb-6">
              Connect your wallet and begin mining to accumulate rewards
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition">
              Start Mining
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
