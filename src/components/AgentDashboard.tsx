"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcSigner } from "ethers";
import { getAgentOnChain, getFirstUseStatus } from "@/lib/contracts";
import { getAgentPayments, getAgentEscrows, getAgentIncentives, getAgent } from "@/lib/api";
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
  escrowVolume: string;
  releasedVolume: string;
  totalEscrows: number;
  activeEscrows: number;
  jobsCompleted: number;
  avgRating: number;
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
      const [agentInfo, firstUse, apiAgent] = await Promise.all([
        getAgentOnChain(walletAddress).catch(() => null),
        getFirstUseStatus(walletAddress).catch(() => false),
        getAgent(walletAddress).catch(() => null),
      ]);
      setAgent(agentInfo);
      const ec = apiAgent?.escrow_counts as { open?: number; active?: number; completed?: number; refunded?: number; total_volume?: string; released_volume?: string } || {};
      const jc = (apiAgent as { job_counts?: { total: number; completed: number } })?.job_counts || { total: 0, completed: 0 };
      setStats({
        escrowVolume: ec.total_volume || "0",
        releasedVolume: ec.released_volume || "0",
        totalEscrows: (ec.open || 0) + (ec.active || 0) + (ec.completed || 0) + (ec.refunded || 0),
        activeEscrows: (ec.open || 0) + (ec.active || 0),
        jobsCompleted: jc.completed,
        avgRating: apiAgent?.avg_rating || 0,
      });
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

      {agent && (
        <>
          <AgentStatsGrid stats={stats || { escrowVolume: "0", releasedVolume: "0", totalEscrows: 0, activeEscrows: 0, jobsCompleted: 0, avgRating: 0 }} />

          <JobQueue
            walletAddress={walletAddress}
            signer={signer}
            onAction={fetchData}
          />

          <AgentIncentives
            signer={signer}
            walletAddress={walletAddress}
            hasClaimedFirstUse={hasClaimedFirstUse}
            paymentCount={stats?.jobsCompleted ?? 0}
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

          <ProfileEditor
            walletAddress={walletAddress}
            signer={signer}
          />
        </>
      )}
    </div>
  );
}
