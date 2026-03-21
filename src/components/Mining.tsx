'use client';

import { Zap, TrendingUp, Shield } from 'lucide-react';

export default function Mining() {
  return (
    <section className="py-20 px-4 bg-slate-800">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">
          Mining & Rewards
        </h2>
        <p className="text-center text-slate-300 mb-16">
          Earn rewards by participating in the Weavrn network
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-700 rounded-lg p-8 border border-slate-600 hover:border-blue-500 transition">
            <Zap className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Fast Rewards</h3>
            <p className="text-slate-300">
              Receive rewards quickly with our optimized reward distribution system
            </p>
          </div>

          <div className="bg-slate-700 rounded-lg p-8 border border-slate-600 hover:border-blue-500 transition">
            <TrendingUp className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Scalable Rewards</h3>
            <p className="text-slate-300">
              Rewards scale with network growth and your contribution level
            </p>
          </div>

          <div className="bg-slate-700 rounded-lg p-8 border border-slate-600 hover:border-blue-500 transition">
            <Shield className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Secure Rewards</h3>
            <p className="text-slate-300">
              Your rewards are protected by advanced security protocols
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
