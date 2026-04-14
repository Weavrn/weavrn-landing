import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import type { ServiceListing } from "../lib/api";

// vi.hoisted ensures the mock spies exist before vi.mock runs (vi.mock is
// hoisted to the top of the file).
const hoisted = vi.hoisted(() => ({
  getListing: vi.fn(),
  createJob: vi.fn(),
  uploadToolInput: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  getListing: hoisted.getListing,
  createJob: hoisted.createJob,
  uploadToolInput: hoisted.uploadToolInput,
}));

// Import after the mock is registered.
import ListingDetail from "./ListingDetail";

const fakeSigner = {} as unknown as import("ethers").JsonRpcSigner;
const fakeWallet = "0x1111111111111111111111111111111111111111";

function makeListing(
  overrides: Partial<ServiceListing> & { input_schema?: unknown },
): ServiceListing {
  return {
    id: 42,
    wallet_address: "0x2222222222222222222222222222222222222222",
    title: "Test listing",
    description: "A listing for testing",
    category: "other",
    tags: [],
    pricing_type: "fixed",
    price_amount: "1",
    price_token: "ETH",
    escrow_strategy: "all_or_nothing",
    escrow_strategy_address: null,
    fee_model: "payer",
    milestone_config: null,
    trickle_duration: null,
    estimated_duration: null,
    input_schema: null,
    active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as ServiceListing;
}

beforeEach(() => {
  hoisted.getListing.mockReset();
  hoisted.createJob.mockReset();
  hoisted.uploadToolInput.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderWithListing(listing: ServiceListing): Promise<void> {
  hoisted.getListing.mockResolvedValue(listing);
  await act(async () => {
    render(
      <ListingDetail id={listing.id} walletAddress={fakeWallet} signer={fakeSigner} />,
    );
  });
  // Wait for the async fetch to resolve and the component to render the
  // request button.
  await waitFor(() => {
    expect(screen.getByText("Request Service")).toBeTruthy();
  });
}

async function clickRequestAndOpenForm(): Promise<void> {
  const requestButton = screen.getByText("Request Service");
  await act(async () => {
    fireEvent.click(requestButton);
  });
  await waitFor(() => {
    expect(screen.getByText("Request this service")).toBeTruthy();
  });
}

describe("ListingDetail — schema branching", () => {
  it("renders SchemaForm for JSON Schema input_schema", async () => {
    await renderWithListing(
      makeListing({
        input_schema: {
          type: "object",
          properties: {
            prompt: { type: "string", title: "Prompt" },
          },
          required: ["prompt"],
        } as unknown as ServiceListing["input_schema"],
      }),
    );

    await clickRequestAndOpenForm();

    const input = screen.getByLabelText(/Prompt/) as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("text");
    expect(input.required).toBe(true);
  });

  it("renders SchemaForm for legacy array input_schema (coerced under the hood)", async () => {
    await renderWithListing(
      makeListing({
        input_schema: [
          {
            name: "prompt",
            label: "Prompt",
            type: "text",
            required: true,
          },
        ] as unknown as ServiceListing["input_schema"],
      }),
    );

    await clickRequestAndOpenForm();

    // The coerced JSON Schema produces the same form output — a text input
    // labelled "Prompt". No legacy DynamicField fallback is used.
    const input = screen.getByLabelText(/Prompt/) as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("text");
    expect(input.required).toBe(true);
  });

  it("falls back to generic textarea form when input_schema is null", async () => {
    await renderWithListing(makeListing({ input_schema: null }));

    await clickRequestAndOpenForm();

    // Generic fallback UI is present.
    expect(screen.getByText("What do you need?")).toBeTruthy();
    expect(
      screen.getByText("Input / instructions (sent as first message)"),
    ).toBeTruthy();

    // SchemaForm is NOT rendered — no schema-driven field with a "Prompt"
    // label should exist, and no select/number fields either.
    expect(screen.queryByLabelText(/Prompt/)).toBeNull();
  });

  it("surfaces a field error and does NOT call createJob when a required field is missing", async () => {
    await renderWithListing(
      makeListing({
        input_schema: {
          type: "object",
          properties: {
            prompt: { type: "string", title: "Prompt" },
          },
          required: ["prompt"],
        } as unknown as ServiceListing["input_schema"],
      }),
    );

    await clickRequestAndOpenForm();

    const submit = screen.getByText("Submit Request");
    await act(async () => {
      fireEvent.click(submit);
    });

    // Error appears inline (keyed at the missing-property path).
    await waitFor(() => {
      expect(screen.getByText(/must have required property/i)).toBeTruthy();
    });

    expect(hoisted.createJob).not.toHaveBeenCalled();
  });
});
