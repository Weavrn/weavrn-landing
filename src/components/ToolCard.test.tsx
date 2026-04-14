import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolCard from "./ToolCard";
import type { ToolSummary } from "../lib/api";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const baseTool: ToolSummary = {
  id: 1,
  wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
  mcp_tool_slug: "image-gen",
  title: "Image Generator",
  description: "Generates images from a text prompt",
  description_for_model: null,
  tool_category: "image_generation",
  output_content_type: "image/png",
  execution_mode: "hosted",
  price_amount: "0.01",
  price_token: "ETH",
  escrow_strategy: "all_or_nothing",
  default_deadline_seconds: 300,
  agent: {
    wallet_address: "0xabcdef0123456789abcdef0123456789abcdef01",
    name: "Acme Labs",
    trust_score: 87,
    active: true,
  },
  call_count: 1234,
  success_rate: 0.97,
};

describe("ToolCard", () => {
  it("renders title, category, execution-mode badge, price, and stats", () => {
    render(<ToolCard tool={baseTool} />);

    expect(screen.getByText("Image Generator")).toBeTruthy();
    expect(screen.getByText(/image generation/i)).toBeTruthy();
    expect(screen.getByText("Hosted")).toBeTruthy();
    expect(screen.getByText("image/png")).toBeTruthy();
    expect(screen.getByText(/Generates images/)).toBeTruthy();
    expect(screen.getByText(/Acme Labs/)).toBeTruthy();
    expect(screen.getByText(/trust 87/)).toBeTruthy();
    expect(screen.getByText(/0\.01 ETH/)).toBeTruthy();
    expect(screen.getByText(/1,234/)).toBeTruthy();
    expect(screen.getByText(/97%/)).toBeTruthy();
  });

  it("links to the provider/slug detail route", () => {
    render(<ToolCard tool={baseTool} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(
      `/tools/${encodeURIComponent(baseTool.agent.wallet_address)}/${encodeURIComponent(baseTool.mcp_tool_slug)}`,
    );
  });

  it("falls back to an em-dash when no price is set and shows BYO mode", () => {
    const t: ToolSummary = {
      ...baseTool,
      execution_mode: "byo",
      price_amount: null,
      price_token: null,
    };
    render(<ToolCard tool={t} />);
    expect(screen.getByText("BYO")).toBeTruthy();
    // em-dash fallback for price
    const priceSlots = screen.getAllByText("—");
    expect(priceSlots.length).toBeGreaterThan(0);
  });

  it("shows a dash for success rate when null", () => {
    const t: ToolSummary = { ...baseTool, success_rate: null };
    render(<ToolCard tool={t} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});
