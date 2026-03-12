"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentOnChain, getAgentStats, getFirstUseStatus } from "@/lib/contracts";
import { getAgentPayments, getAgentEscrows, getAgentIncentives } from "@/lib/api";
import type { PaymentRecord, EscrowRecord, IncentiveClaim } from "@/lib/api";
import AgentRegistration from "./AgentRegistration";
import AgentStatsGrid from "./AgentStatsGrid";
import AgentIncentives from "./AgentIncentives";
import PaymentHistory from "./PaymentHistory";
import EscrowList from "./EscrowList";
import ProfileEditor from "./ProfileEditor";
import JobQueue from "./JobQueue";
import MyListings from "./MyListings";

interface Props {
  walletAddress: string;
  signer: JsonRpcSigner | null;
}

interface AgentInfo {
  agentId: number;
  name: string;
  metadataURI: string;
  active: boolean;
  isRegistered: boolean;
}

interface AgentStatsData {
  volumeETH: string;
  paymentCount: number;
  receivedETH: string;
  receivedCount: number;
  uniqueRecipients: number;
  escrowCount: number;
  releasedCount: number;
}

export default function AgentDashboard({ walletAddress, signer }: Props) {
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [stats, setStats] = useState<AgentStatsData | null>(null);
  const [hasClaimedFirstUse, setHasClaimedFirstUse] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [escrowTotal, setEscrowTotal] = useState(0);
  const [escrowPage, setEscrowPage] = useState(1);
  const [escrowStatus, setEscrowStatus] = useState<string | undefined>();
  const [incentives, setIncentives] = useState<IncentiveClaim[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentInfo, agentStats, firstUse] = await Promise.all([
        getAgentOnChain(walletAddress).catch(() => null),
        getAgentStats(walletAddress).catch(() => null),
        getFirstUseStatus(walletAddress).catch(() => false),
      ]);
      setAgent(agentInfo);
      setStats(agentStats);
      setHasClaimedFirstUse(firstUse);

      const [payRes, escRes, incRes] = await Promise.all([
        getAgentPayments(walletAddress, 1, 50).catch(() => ({ payments: [], total: 0, page: 1, limit: 50 })),
        getAgentEscrows(walletAddress, 1, 50).catch(() => ({ escrows: [], total: 0, page: 1, limit: 50 })),
        getAgentIncentives(walletAddress).catch(() => []),
      ]);
      setPayments(payRes.payments);
      setPaymentTotal(payRes.total);
      setEscrows(escRes.escrows);
      setEscrowTotal(escRes.total);
      setIncentives(incRes);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPayments = useCallback(async (page: number) => {
    try {
      const res = await getAgentPayments(walletAddress, page, 50);
      setPayments(res.payments);
      setPaymentTotal(res.total);
      setPaymentPage(page);
    } catch { /* ignore */ }
  }, [walletAddress]);

  const fetchEscrows = useCallback(async (page: number, status?: string) => {
    try {
      const res = await getAgentEscrows(walletAddress, page, 50, status);
      setEscrows(res.escrows);
      setEscrowTotal(res.total);
      setEscrowPage(page);
      setEscrowStatus(status);
    } catch { /* ignore */ }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-weavrn-muted">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {error && (
        <div className="glow-card rounded-xl p-4 border-red-500/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-weavrn-muted hover:text-white">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <AgentRegistration
        agent={agent}
        signer={signer}
        onRegistered={fetchData}
      />

      {agent && stats && (
        <>
          <AgentStatsGrid stats={stats} />

          <AgentIncentives
            signer={signer}
            walletAddress={walletAddress}
            hasClaimedFirstUse={hasClaimedFirstUse}
            paymentCount={stats.paymentCount}
            incentives={incentives}
            onClaimed={fetchData}
          />

          <PaymentHistory
            payments={payments}
            total={paymentTotal}
            page={paymentPage}
            walletAddress={walletAddress}
            onPageChange={fetchPayments}
          />

          <EscrowList
            escrows={escrows}
            total={escrowTotal}
            page={escrowPage}
            status={escrowStatus}
            walletAddress={walletAddress}
            signer={signer}
            onPageChange={(p) => fetchEscrows(p, escrowStatus)}
            onStatusChange={(s) => fetchEscrows(1, s)}
            onAction={fetchData}
          />

          <MyListings
            walletAddress={walletAddress}
            signer={signer}
          />

          <JobQueue
            walletAddress={walletAddress}
            signer={signer}
            onAction={fetchData}
          />

          <ProfileEditor
            walletAddress={walletAddress}
            signer={signer}
          />
        </>
      )}
    </div>
  );
}
