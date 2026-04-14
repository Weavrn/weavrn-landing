import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import MyListings from "./MyListings";
import type { ServiceListing } from "../lib/api";

const getAgentListingsMock = vi.fn();
vi.mock("@/lib/api", () => ({
  getAgentListings: (...args: unknown[]) => getAgentListingsMock(...args),
  createListing: vi.fn(),
  deactivateListing: vi.fn(),
  updateListing: vi.fn(),
}));

function buildListing(overrides: Partial<ServiceListing> = {}): ServiceListing {
  return {
    id: 1,
    wallet_address: "0x1234567890abcdef1234567890abcdef12345678",
    title: "My Service",
    description: "desc",
    category: "code",
    tags: [],
    pricing_type: "fixed",
    price_amount: "0.01",
    price_token: "ETH",
    escrow_strategy: "all_or_nothing",
    escrow_strategy_address: null,
    fee_model: "payer",
    milestone_config: null,
    trickle_duration: null,
    estimated_duration: null,
    input_schema: null,
    active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("MyListings", () => {
  beforeEach(() => {
    getAgentListingsMock.mockReset();
  });

  it("shows the TOOL badge, tool_category, and execution_mode for a listing backed by an MCP tool", async () => {
    const toolListing = buildListing({
      id: 10,
      title: "Image Generator Listing",
      category: "creative",
      mcp_tool_slug: "image-gen",
      tool_category: "image_generation",
      execution_mode: "hosted",
    });

    getAgentListingsMock.mockResolvedValue({
      listings: [toolListing],
      total: 1,
      page: 1,
      limit: 20,
    });

    await act(async () => {
      render(
        <MyListings
          walletAddress="0x1234567890abcdef1234567890abcdef12345678"
          signer={null}
        />,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Image Generator Listing")).toBeTruthy();
    });

    // TOOL pill visible
    const toolBadge = screen.getByTestId("tool-badge");
    expect(toolBadge.textContent).toBe("TOOL");

    // category + tool_category rendered together (e.g. "creative · image generation")
    expect(screen.getByText(/creative.*image generation/)).toBeTruthy();

    // execution_mode badge visible
    const modeBadge = screen.getByTestId("tool-execution-mode");
    expect(modeBadge.textContent).toMatch(/Hosted/);
  });

  it("does not render the TOOL badge or execution-mode badge for plain listings without mcp_tool_slug", async () => {
    const plainListing = buildListing({
      id: 11,
      title: "Plain Service",
      category: "code",
    });

    getAgentListingsMock.mockResolvedValue({
      listings: [plainListing],
      total: 1,
      page: 1,
      limit: 20,
    });

    await act(async () => {
      render(
        <MyListings
          walletAddress="0x1234567890abcdef1234567890abcdef12345678"
          signer={null}
        />,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Plain Service")).toBeTruthy();
    });

    expect(screen.queryByTestId("tool-badge")).toBeNull();
    expect(screen.queryByTestId("tool-execution-mode")).toBeNull();
    // Plain category still rendered as-is (no " · ...")
    expect(screen.getByText("code")).toBeTruthy();
  });
});
