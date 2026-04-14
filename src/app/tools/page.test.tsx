import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import ToolsPage from "./page";
import type { ToolSummary } from "../../lib/api";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
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

const listToolsMock = vi.fn();
vi.mock("@/lib/api", () => ({
  listTools: (...args: unknown[]) => listToolsMock(...args),
}));

const sampleTool: ToolSummary = {
  id: 42,
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
  mcp_tool_slug: "text-rewrite",
  title: "Text Rewriter",
  description: "Rewrites text in a chosen style",
  description_for_model: null,
  tool_category: "text_generation",
  output_content_type: "text",
  execution_mode: "manual",
  price_amount: "0.005",
  price_token: "ETH",
  escrow_strategy: "all_or_nothing",
  default_deadline_seconds: 3600,
  agent: {
    wallet_address: "0xabcdef0123456789abcdef0123456789abcdef01",
    name: "Writer Bot",
    trust_score: 75,
    active: true,
  },
  call_count: 7,
  success_rate: 1,
};

describe("ToolsPage", () => {
  beforeEach(() => {
    listToolsMock.mockReset();
  });

  it("renders empty state when the API returns no tools", async () => {
    listToolsMock.mockResolvedValue({ tools: [], next_cursor: null });

    await act(async () => {
      render(<ToolsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/no tools match your filters/i)).toBeTruthy();
    });
    expect(listToolsMock).toHaveBeenCalled();
  });

  it("renders a tool card when the API returns a tool", async () => {
    listToolsMock.mockResolvedValue({ tools: [sampleTool], next_cursor: null });

    await act(async () => {
      render(<ToolsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText("Text Rewriter")).toBeTruthy();
    });
    expect(screen.getByText(/Writer Bot/)).toBeTruthy();
    expect(screen.getByText(/0\.005 ETH/)).toBeTruthy();
  });

  it("shows a Load more button when next_cursor is present and appends results on click", async () => {
    listToolsMock
      .mockResolvedValueOnce({ tools: [sampleTool], next_cursor: "cursor-1" })
      .mockResolvedValueOnce({
        tools: [{ ...sampleTool, id: 43, title: "Text Rewriter v2", mcp_tool_slug: "text-rewrite-2" }],
        next_cursor: null,
      });

    await act(async () => {
      render(<ToolsPage />);
    });

    await waitFor(() => expect(screen.getByText("Text Rewriter")).toBeTruthy());
    const loadMore = screen.getByRole("button", { name: /load more/i });
    await act(async () => {
      fireEvent.click(loadMore);
    });
    await waitFor(() => expect(screen.getByText("Text Rewriter v2")).toBeTruthy());
    expect(listToolsMock).toHaveBeenCalledTimes(2);
    const secondCallArg = listToolsMock.mock.calls[1][0] as { cursor?: string };
    expect(secondCallArg.cursor).toBe("cursor-1");
  });
});
