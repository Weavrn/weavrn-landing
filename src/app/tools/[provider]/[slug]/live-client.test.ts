/**
 * Focused coverage for `buildLiveClient` — the adapter that translates the
 * page's narrow `ToolDetailClient` contract onto @weavrn/sdk's `WeavrnClient`.
 *
 * We mock the SDK at the module boundary (per the task's "mock the SDK
 * boundary rather than re-testing SDK internals"). The SDK's ethers parsing
 * helpers are used as-is so we can assert the adapter passes the right
 * parsed values through.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { JsonRpcSigner } from "ethers";

// ── Hoisted spies wired into the @weavrn/sdk mock below. Each test resets
// them; the WeavrnClient constructor is built once per `buildLiveClient`
// call and returns the `instance` handle below so tests can poke at it.
const sdkSpies = vi.hoisted(() => {
  const instance = {
    strategies: {
      allOrNothing: "0xaaa0",
      milestone: "0xbbb0",
      trickle: "0xccc0",
    },
    createJob: vi.fn(),
    createEscrowETH: vi.fn(),
    createEscrowERC20: vi.fn(),
    approveEscrow: vi.fn(),
    linkJobEscrow: vi.fn(),
    approveJob: vi.fn(),
    subscribe: vi.fn(),
  };
  return {
    instance,
    constructed: vi.fn(),
  };
});

vi.mock("@weavrn/sdk", () => {
  return {
    WeavrnClient: vi.fn().mockImplementation((opts: unknown) => {
      sdkSpies.constructed(opts);
      return sdkSpies.instance;
    }),
    // The page imports `WeavrnEvent` as a type only; a shape stub suffices
    // for module resolution in tests that don't use it directly.
  };
});

// Keep the api module's session-based getJob mockable for the `subscribe`
// bridge's job-hydrate step.
const apiGetJobMock = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getJob: (...args: unknown[]) => apiGetJobMock(...args),
  };
});

// The tool-detail module is self-contained (no Next route shell); just import.
const { buildLiveClient } = await import("./tool-detail");

const fakeSigner = { _kind: "fake" } as unknown as JsonRpcSigner;

beforeEach(() => {
  Object.values(sdkSpies.instance).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) {
      (fn as { mockReset: () => void }).mockReset();
    }
  });
  sdkSpies.instance.strategies = {
    allOrNothing: "0xaaa0",
    milestone: "0xbbb0",
    trickle: "0xccc0",
  };
  sdkSpies.constructed.mockReset();
  apiGetJobMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildLiveClient — SDK wiring", () => {
  it("constructs WeavrnClient with signer + chainId from NEXT_PUBLIC_CHAIN_ID", () => {
    const prev = process.env.NEXT_PUBLIC_CHAIN_ID;
    process.env.NEXT_PUBLIC_CHAIN_ID = "8453";
    try {
      buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });
      expect(sdkSpies.constructed).toHaveBeenCalledTimes(1);
      const opts = sdkSpies.constructed.mock.calls[0][0] as {
        signer: JsonRpcSigner;
        chainId: number;
      };
      expect(opts.signer).toBe(fakeSigner);
      expect(opts.chainId).toBe(8453);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_CHAIN_ID;
      else process.env.NEXT_PUBLIC_CHAIN_ID = prev;
    }
  });

  it("defaults to Base Sepolia (84532) when NEXT_PUBLIC_CHAIN_ID is unset", () => {
    const prev = process.env.NEXT_PUBLIC_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_CHAIN_ID;
    try {
      buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });
      const opts = sdkSpies.constructed.mock.calls[0][0] as { chainId: number };
      expect(opts.chainId).toBe(84532);
    } finally {
      if (prev !== undefined) process.env.NEXT_PUBLIC_CHAIN_ID = prev;
    }
  });

  it("createJob delegates to WeavrnClient.createJob and returns the job id", async () => {
    sdkSpies.instance.createJob.mockResolvedValue({ id: 501 });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    const result = await c.createJob({
      listing_id: 77,
      provider_wallet: "0xprovider",
      title: "tool:x",
    });
    expect(result).toEqual({ id: 501 });
    expect(sdkSpies.instance.createJob).toHaveBeenCalledWith({
      listing_id: 77,
      provider_wallet: "0xprovider",
      title: "tool:x",
    });
  });

  it("createEscrowETH parses ether, computes deadline, picks strategy, and returns escrowId", async () => {
    sdkSpies.instance.createEscrowETH.mockResolvedValue({ escrowId: 900, txHash: "0x" });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    const now = Math.floor(Date.now() / 1000);
    const res = await c.createEscrowETH({
      recipient: "0xprovider",
      amountEth: "0.01",
      deadlineSeconds: 1800,
      strategyName: "all_or_nothing",
      memo: "tool-501",
    });
    expect(res.escrowId).toBe(900);
    expect(sdkSpies.instance.createEscrowETH).toHaveBeenCalledTimes(1);
    const call = sdkSpies.instance.createEscrowETH.mock.calls[0];
    expect(call[0]).toBe("0xprovider");
    // parseEther("0.01") === 10^16
    expect(call[1]).toBe(BigInt("10000000000000000"));
    expect(typeof call[2]).toBe("number");
    expect(call[2]).toBeGreaterThanOrEqual(now + 1800 - 2);
    expect(call[2]).toBeLessThanOrEqual(now + 1800 + 2);
    expect(call[3]).toBe("0xaaa0"); // allOrNothing address from strategies map
    expect(call[4]).toBe("0x"); // strategyData empty
    expect(call[5]).toEqual({ memo: "tool-501" });
  });

  it("createEscrowETH uses milestone address when strategyName='milestone'", async () => {
    sdkSpies.instance.createEscrowETH.mockResolvedValue({ escrowId: 1, txHash: "0x" });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    await c.createEscrowETH({
      recipient: "0xprovider",
      amountEth: "0.01",
      deadlineSeconds: 60,
      strategyName: "milestone",
      memo: "m",
    });
    expect(sdkSpies.instance.createEscrowETH.mock.calls[0][3]).toBe("0xbbb0");
  });

  it("createEscrowETH honors a strategyAddress override when provided", async () => {
    sdkSpies.instance.createEscrowETH.mockResolvedValue({ escrowId: 1, txHash: "0x" });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    await c.createEscrowETH({
      recipient: "0xprovider",
      amountEth: "0.01",
      deadlineSeconds: 60,
      strategyName: "all_or_nothing",
      strategyAddress: "0xdeadbeef",
      memo: "m",
    });
    expect(sdkSpies.instance.createEscrowETH.mock.calls[0][3]).toBe("0xdeadbeef");
  });

  it("createEscrowERC20 approves and creates the ERC-20 escrow", async () => {
    sdkSpies.instance.approveEscrow.mockResolvedValue("0xapprovetx");
    sdkSpies.instance.createEscrowERC20.mockResolvedValue({ escrowId: 42, txHash: "0x" });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    const res = await c.createEscrowERC20({
      recipient: "0xprovider",
      token: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "1",
      deadlineSeconds: 300,
      strategyName: "all_or_nothing",
      memo: "erc-1",
    });
    expect(res.escrowId).toBe(42);

    expect(sdkSpies.instance.approveEscrow).toHaveBeenCalledTimes(1);
    expect(sdkSpies.instance.approveEscrow.mock.calls[0][0]).toBe(
      "0x1234567890abcdef1234567890abcdef12345678",
    );
    // parseUnits("1", 18) === 10^18
    expect(sdkSpies.instance.approveEscrow.mock.calls[0][1]).toBe(
      BigInt("1000000000000000000"),
    );

    const call = sdkSpies.instance.createEscrowERC20.mock.calls[0];
    expect(call[0]).toBe("0xprovider");
    expect(call[1]).toBe("0x1234567890abcdef1234567890abcdef12345678");
    expect(call[2]).toBe(BigInt("1000000000000000000"));
    expect(call[5]).toBe("0x");
    expect(call[6]).toEqual({ memo: "erc-1" });
  });

  it("linkJobEscrow delegates to WeavrnClient.linkJobEscrow", async () => {
    sdkSpies.instance.linkJobEscrow.mockResolvedValue({} as never);
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    await c.linkJobEscrow({ jobId: 501, escrowId: 900 });
    expect(sdkSpies.instance.linkJobEscrow).toHaveBeenCalledWith(501, 900);
  });

  it("approveJob delegates to WeavrnClient.approveJob", async () => {
    sdkSpies.instance.approveJob.mockResolvedValue({} as never);
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    await c.approveJob({ jobId: 501, escrowId: 900 });
    expect(sdkSpies.instance.approveJob).toHaveBeenCalledWith(501, 900);
  });

  it("getJob delegates to the session-based apiGetJob (landing auth path)", async () => {
    apiGetJobMock.mockResolvedValue({ id: 501, status: "delivered" });
    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });

    const job = await c.getJob(501);
    expect(job).toEqual({ id: 501, status: "delivered" });
    expect(apiGetJobMock).toHaveBeenCalledWith(501);
  });

  it("subscribe bridges the SDK SSE stream into ToolEvent, fetching the job on job_delivered", async () => {
    let sdkCb: ((event: { type: string; wallet: string; data: unknown; timestamp: number }) => void) | null = null;
    const unsubSpy = vi.fn();
    sdkSpies.instance.subscribe.mockImplementation(async (fn: typeof sdkCb) => {
      sdkCb = fn;
      return unsubSpy;
    });
    apiGetJobMock.mockResolvedValue({ id: 501, status: "delivered" });

    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });
    const events: Array<{ type: string; jobId: number; job?: unknown; error?: string }> = [];
    const sync = c.subscribe((e) => events.push(e));

    // Wait for the subscribe() promise to resolve (sdkCb gets wired).
    await new Promise((r) => setTimeout(r, 0));
    expect(sdkCb).not.toBeNull();

    // Deliver an event the page understands.
    sdkCb!({
      type: "job_delivered",
      wallet: "0xwallet",
      data: { jobId: 501 },
      timestamp: Date.now(),
    });
    // apiGetJob is async; give it a tick.
    await new Promise((r) => setTimeout(r, 0));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("job_delivered");
    expect(events[0].jobId).toBe(501);
    expect(events[0].job).toEqual({ id: 501, status: "delivered" });

    sync();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it("subscribe maps job_failed with the error payload without fetching the job", async () => {
    let sdkCb: ((event: { type: string; wallet: string; data: unknown; timestamp: number }) => void) | null = null;
    sdkSpies.instance.subscribe.mockImplementation(async (fn: typeof sdkCb) => {
      sdkCb = fn;
      return () => {};
    });

    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });
    const events: Array<{ type: string; jobId: number; error?: string }> = [];
    c.subscribe((e) => events.push(e));
    await new Promise((r) => setTimeout(r, 0));

    sdkCb!({
      type: "job_failed",
      wallet: "0xwallet",
      data: { jobId: 777, error: "byo_http_500: boom" },
      timestamp: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "job_failed",
      jobId: 777,
      error: "byo_http_500: boom",
    });
    expect(apiGetJobMock).not.toHaveBeenCalled();
  });

  it("subscribe unsubscribes immediately when cancelled before SDK subscribe() resolves", async () => {
    const unsubSpy = vi.fn();
    let resolveSubscribe: ((fn: () => void) => void) | null = null;
    sdkSpies.instance.subscribe.mockImplementation(() => {
      return new Promise<() => void>((resolve) => {
        resolveSubscribe = resolve;
      });
    });

    const c = buildLiveClient({ signer: fakeSigner, walletAddress: "0xwallet" });
    const sync = c.subscribe(() => {});

    // Cancel before the SDK's subscribe() resolves.
    sync();
    // Now resolve — the bridge should tear down the unsubscribe fn even
    // though the caller already asked to cancel.
    resolveSubscribe!(unsubSpy);
    await new Promise((r) => setTimeout(r, 0));

    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });
});
