'use client';

import { useState } from 'react';

export default function RewardsCalculator() {
  const [amount, setAmount] = useState<number>(1000);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  const calculateRewards = () => {
    // Daily reward rate: ~0.5% per day
    const dailyRate = 0.005;
    const days = period === 'daily' ? 1 : period === 'monthly' ? 30 : 365;
    return amount * dailyRate * days;
  };

  const rewards = calculateRewards();

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">
          Rewards Calculator
        </h2>
        <p className="text-center text-slate-300 mb-12">
          Estimate your potential rewards from mining
        </p>

        <div className="bg-slate-700 rounded-lg p-8 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Amount to Mine
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-4 py-2 rounded bg-slate-600 text-white border border-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-slate-400 mt-2">WVRN tokens</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Time Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'daily' | 'monthly' | 'yearly')}
                className="w-full px-4 py-2 rounded bg-slate-600 text-white border border-slate-500 focus:border-blue-500 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="mt-8 p-6 bg-slate-600 rounded-lg border border-slate-500">
            <p className="text-slate-300 text-sm mb-2">Estimated Rewards</p>
            <p className="text-4xl font-bold text-blue-400">
              {rewards.toFixed(2)} WVRN
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Based on current reward rates
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
