import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import type { ToolDetail, Job } from "../../../../lib/api";

// Mock Next link + Image-like helpers, mirroring other tool tests.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/AppHeader", () => ({
  default: () => <div data-testid="app-header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

const getToolMock = vi.fn();
const getToolStatsMock = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("../../../../lib/api")>(
      "../../../../lib/api",
    );
  return {
    ...actual,
    getTool: (...args: unknown[]) => getToolMock(...args),
    getToolStats: (...args: unknown[]) => getToolStatsMock(...args),
  };
});

// Make sure contracts.ts doesn't try to parse env for module load:
vi.mock("@/lib/contracts", () => ({
  createEscrowETH: vi.fn(),
  releaseEscrow: vi.fn(),
}));

import ToolDetailPage, {
  ToolDetailView,
  type ToolDetailClient,
  type ToolEvent,
} from "./page";

function baseTool(overrides: Partial<ToolDetail> = {}): ToolDetail {
  const tool: ToolDetail = {
    id: 77,
    wallet_address: "0x1111111111111111111111111111111111111111",
    mcp_tool_slug: "rewrite",
    title: "Rewriter",
    description: "Rewrites your text",
    description_for_model: "Internal: rewrites text per style arg",
    tool_category: "text_generation",
    output_content_type: "text",
    execution_mode: "manual",
    price_amount: "0.01",
    price_token: "ETH",
    escrow_strategy: "all_or_nothing",
    default_deadline_seconds: 1800,
    agent: {
      wallet_address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      name: "Writer Bot",
      trust_score: 82,
      active: true,
    },
    call_count: 12,
    success_rate: 0.95,
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", title: "Prompt" },
      },
      required: ["prompt"],
    },
    output_schema: null,
    timeout_seconds: 60,
    max_input_bytes: 10_000,
    max_output_bytes: 1_000_000,
    max_calls_per_minute: null,
    max_calls_per_day: null,
    stats: {
      call_count: 12,
      success_count: 11,
      failure_count: 1,
      timeout_count: 0,
      success_rate: 0.95,
      p50_latency_ms: 1200,
      p95_latency_ms: 4800,
      revenue: "0.12",
      window: "all",
    },
    recent_reviews: [],
    ...overrides,
  };
  return tool;
}

function stubClient(
  overrides: Partial<ToolDetailClient> = {},
): ToolDetailClient {
  const noop = async () => {
    throw new Error("not implemented");
  };
  const defaultSubscribe: ToolDetailClient["subscribe"] = () => () => {};
  return {
    createJob: overrides.createJob ?? (noop as ToolDetailClient["createJob"]),
    createEscrowETH:
      overrides.createEscrowETH ??
      (noop as unknown as ToolDetailClient["createEscrowETH"]),
    createEscrowERC20:
      overrides.createEscrowERC20 ??
      (noop as unknown as ToolDetailClient["createEscrowERC20"]),
    linkJobEscrow:
      overrides.linkJobEscrow ??
      (noop as unknown as ToolDetailClient["linkJobEscrow"]),
    getJob: overrides.getJob ?? (noop as ToolDetailClient["getJob"]),
    approveJob:
      overrides.approveJob ??
      (noop as unknown as ToolDetailClient["approveJob"]),
    subscribe: overrides.subscribe ?? defaultSubscribe,
  };
}

// A minimal signer stand-in — handlers only check truthiness, not call methods
// on it when the client is injected.
const fakeSigner = {} as unknown as import("ethers").JsonRpcSigner;
const fakeWallet = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("ToolDetailView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders title, description, price, provider info, and category/mode badges", () => {
    const tool = baseTool();
    render(<ToolDetailView tool={tool} />);

    expect(screen.getByText("Rewriter")).toBeTruthy();
    expect(screen.getByText(/Rewrites your text/)).toBeTruthy();
    expect(screen.getByText(/0\.01 ETH/)).toBeTruthy();
    expect(screen.getByText(/Writer Bot/)).toBeTruthy();
    expect(screen.getByText(/trust 82/)).toBeTruthy();
    // category humanized
    expect(screen.getByText(/text generation/i)).toBeTruthy();
    // mode badge
    const badge = screen.getByTestId("tool-mode-badge");
    expect(badge.textContent).toBe("Manual");
  });

  it("renders SchemaForm fields derived from a JSON Schema input", () => {
    const tool = baseTool();
    render(<ToolDetailView tool={tool} />);
    expect(screen.getByLabelText(/Prompt/)).toBeTruthy();
  });

  it("renders SchemaForm fields derived from a legacy input_schema array", () => {
    const tool = baseTool({
      input_schema: [
        {
          name: "topic",
          type: "text",
          required: true,
          label: "Topic",
        },
        {
          name: "notes",
          type: "textarea",
          label: "Notes",
        },
      ],
    });
    render(<ToolDetailView tool={tool} />);
    expect(screen.getByLabelText(/Topic/)).toBeTruthy();
    expect(screen.getByLabelText(/Notes/)).toBeTruthy();
  });

  it("uses 'Request service' for manual mode and 'Run tool' for hosted/byo", () => {
    const manualTool = baseTool({ execution_mode: "manual" });
    const { unmount } = render(<ToolDetailView tool={manualTool} />);
    expect(screen.getByTestId("tool-run-btn").textContent).toMatch(/Request service/);
    unmount();

    const hostedTool = baseTool({ execution_mode: "hosted" });
    const { unmount: unmount2 } = render(<ToolDetailView tool={hostedTool} />);
    expect(screen.getByTestId("tool-run-btn").textContent).toMatch(/Run tool/);
    unmount2();

    const byoTool = baseTool({ execution_mode: "byo" });
    render(<ToolDetailView tool={byoTool} />);
    expect(screen.getByTestId("tool-run-btn").textContent).toMatch(/Run tool/);
  });

  it("surfaces a validation error on invalid submit and does NOT call client.createJob", async () => {
    const createJob = vi.fn();
    const client = stubClient({ createJob });
    const tool = baseTool(); // `prompt` required, left blank

    render(
      <ToolDetailView
        tool={tool}
        walletAddress={fakeWallet}
        signer={fakeSigner}
        client={client}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("tool-run-btn"));
    });

    await waitFor(() => {
      expect(screen.getByText(/fix the highlighted/i)).toBeTruthy();
    });
    expect(createJob).not.toHaveBeenCalled();
  });

  it("renders ToolOutputView when injected into the delivered state", () => {
    const tool = baseTool({
      output_content_type: "image/png",
      recent_reviews: [],
    });
    const deliverable = {
      content: null,
      output: { image_url: "https://cdn.example.com/output.png" },
      content_type: "image/png",
      format: "tool_output_v1",
      tool_slug: tool.mcp_tool_slug,
    } as unknown as Job["deliverable_data"];

    render(
      <ToolDetailView
        tool={tool}
        walletAddress={fakeWallet}
        signer={fakeSigner}
        initialStatus="delivered"
        initialJobId={55}
        initialEscrowId={66}
        initialDeliverable={deliverable}
      />,
    );

    const img = screen.getByTestId("tool-output-image") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(
      "https://cdn.example.com/output.png",
    );
    // Release button visible in delivered state.
    expect(screen.getByTestId("tool-release-btn")).toBeTruthy();
  });

  it("renders 'No reviews yet.' when recent_reviews is empty", () => {
    render(<ToolDetailView tool={baseTool()} />);
    expect(screen.getByText(/No reviews yet/)).toBeTruthy();
  });

  it("renders up to 5 reviews with stars and truncated wallet", () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      rating: 5,
      comment: `Review ${i + 1}`,
      reviewer_wallet: `0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${i}`,
      created_at: new Date().toISOString(),
    }));
    const tool = baseTool({ recent_reviews: reviews });
    render(<ToolDetailView tool={tool} />);
    expect(screen.getByText("Review 1")).toBeTruthy();
    expect(screen.getByText("Review 5")).toBeTruthy();
    expect(screen.queryByText("Review 6")).toBeNull();
  });

  it("walks happy path with injected client: createJob -> createEscrowETH -> linkJobEscrow -> subscribe -> delivered", async () => {
    let subscribeCb: ((e: ToolEvent) => void) | null = null;
    const createJob = vi.fn().mockResolvedValue({ id: 501 });
    const createEscrowETH = vi.fn().mockResolvedValue({ escrowId: 9001 });
    const linkJobEscrow = vi.fn().mockResolvedValue(undefined);
    const subscribe: ToolDetailClient["subscribe"] = (cb) => {
      subscribeCb = cb;
      return () => {};
    };
    const client = stubClient({
      createJob,
      createEscrowETH,
      linkJobEscrow,
      subscribe,
    });
    const tool = baseTool({
      input_schema: null,
      output_content_type: "text",
    });

    render(
      <ToolDetailView
        tool={tool}
        walletAddress={fakeWallet}
        signer={fakeSigner}
        client={client}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("tool-run-btn"));
    });

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(createEscrowETH).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(linkJobEscrow).toHaveBeenCalledWith({ jobId: 501, escrowId: 9001 });
    });
    await waitFor(() => {
      expect(subscribeCb).not.toBeNull();
    });

    // Fire a delivery event.
    act(() => {
      subscribeCb?.({
        type: "job_delivered",
        jobId: 501,
        job: {
          id: 501,
          listing_id: tool.id,
          requester_wallet: fakeWallet,
          provider_wallet: tool.wallet_address,
          title: "tool:rewrite",
          description: null,
          status: "delivered",
          escrow_id: 9001,
          deliverable_type: "text",
          deliverable_data: {
            content: null,
            output: "hello",
            content_type: "text",
            format: "tool_output_v1",
            tool_slug: tool.mcp_tool_slug,
          } as unknown as Job["deliverable_data"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("tool-output-text")).toBeTruthy();
    });
    expect(screen.getByTestId("tool-release-btn")).toBeTruthy();
  });
});

describe("ToolDetailPage (outer route)", () => {
  beforeEach(() => {
    getToolMock.mockReset();
    getToolStatsMock.mockReset();
  });

  it("shows 'Tool not found' when the API throws a not-found error", async () => {
    getToolMock.mockRejectedValue(new Error("Tool not found"));

    await act(async () => {
      render(
        <ToolDetailPage params={{ provider: "0xabc", slug: "missing" }} />,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Tool not found/i)).toBeTruthy();
    });
    expect(getToolMock).toHaveBeenCalledWith("0xabc", "missing");
  });

  it("fetches and renders the tool on the happy path", async () => {
    getToolMock.mockResolvedValue(baseTool());

    await act(async () => {
      render(
        <ToolDetailPage params={{ provider: "0xaaaa", slug: "rewrite" }} />,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Rewriter")).toBeTruthy();
    });
  });
});
