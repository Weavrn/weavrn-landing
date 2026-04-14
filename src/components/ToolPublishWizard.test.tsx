import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ToolPublishWizard, { __test } from "./ToolPublishWizard";

// ─── Mocks ────────────────────────────────────────────────────────────────

const getToolMock = vi.fn();
const getToolConfigMock = vi.fn();
const createListingMock = vi.fn();
const updateListingMock = vi.fn();
const getListingMock = vi.fn();

vi.mock("../lib/api", () => ({
  API_URL: "http://test.local",
  getTool: (...args: unknown[]) => getToolMock(...args),
  getToolConfig: (...args: unknown[]) => getToolConfigMock(...args),
  createListing: (...args: unknown[]) => createListingMock(...args),
  updateListing: (...args: unknown[]) => updateListingMock(...args),
  getListing: (...args: unknown[]) => getListingMock(...args),
}));

// Minimal signer stub — we don't call signMessage because api mocks intercept.
const stubSigner = {
  signMessage: vi.fn().mockResolvedValue("0xdeadbeef"),
  getAddress: vi.fn().mockResolvedValue("0xabcabcabcabcabcabcabcabcabcabcabcabcabca"),
} as unknown as import("ethers").JsonRpcSigner;

const WALLET = "0xabcabcabcabcabcabcabcabcabcabcabcabcabca";

// Quiet the jsdom navigation by stubbing window.location.
const originalHref = (globalThis as unknown as { location?: Location }).location?.href;

// Install a plain in-memory Storage shim so tests don't depend on whatever
// jsdom variant vitest provides. Matches the Web Storage API just enough for
// the wizard's getItem / setItem / removeItem calls.
function installLocalStorageShim() {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: shim,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: shim,
    });
  }
}

beforeEach(() => {
  getToolMock.mockReset();
  getToolConfigMock.mockReset();
  createListingMock.mockReset();
  updateListingMock.mockReset();
  getListingMock.mockReset();
  installLocalStorageShim();
  // Default: both hosted + byo enabled.
  getToolConfigMock.mockResolvedValue({ byoEnabled: true, hostedEnabled: true });
  // Default: slug available (404-ish error).
  getToolMock.mockRejectedValue(new Error("Tool not found"));
});

afterEach(() => {
  cleanup();
  if (originalHref !== undefined && typeof window !== "undefined") {
    try {
      Object.defineProperty(window, "location", {
        value: { href: originalHref },
        writable: true,
      });
    } catch {
      // ignore
    }
  }
});

function mountWizard(props?: Partial<React.ComponentProps<typeof ToolPublishWizard>>) {
  return render(
    <ToolPublishWizard
      walletAddress={props?.walletAddress ?? WALLET}
      signer={props?.signer ?? stubSigner}
      editListingId={props?.editListingId ?? null}
      searchParams={props?.searchParams ?? null}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("ToolPublishWizard - helpers", () => {
  it("builds a publish payload that includes every MCP column", () => {
    const draft = __test.makeInitialDraft();
    draft.title = "Foo";
    draft.mcp_tool_slug = "foo-bar";
    draft.description = "desc";
    draft.description_for_model = "for the model";
    const payload = __test.buildPublishPayload(draft);
    for (const key of [
      "mcp_tool_slug",
      "description_for_model",
      "tool_category",
      "input_schema",
      "output_schema",
      "output_content_type",
      "execution_mode",
      "endpoint_url",
      "endpoint_secret",
      "runner_ref",
      "runner_config",
      "timeout_seconds",
      "max_input_bytes",
      "max_output_bytes",
      "default_deadline_seconds",
      "max_calls_per_minute",
      "max_calls_per_day",
      "auto_release_on_delivery",
      "title",
      "description",
      "category",
      "tags",
      "pricing_type",
      "price_amount",
      "price_token",
      "escrow_strategy",
    ]) {
      expect(payload).toHaveProperty(key);
    }
    expect(payload.mcp_tool_slug).toBe("foo-bar");
    expect(payload.execution_mode).toBe("manual");
  });

  it("chooses per-mode default deadlines", () => {
    expect(__test.defaultDeadlineFor("manual")).toBe(3600);
    expect(__test.defaultDeadlineFor("hosted")).toBe(300);
    expect(__test.defaultDeadlineFor("byo")).toBe(1800);
  });
});

describe("ToolPublishWizard - step 1 slug availability", () => {
  it("renders 'Slug taken' when getTool resolves with a tool", async () => {
    getToolMock.mockResolvedValue({ id: 1, mcp_tool_slug: "taken-slug" });
    await act(async () => {
      mountWizard();
    });
    const slugInput = screen.getByLabelText(/MCP tool slug/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(slugInput, { target: { value: "taken-slug" } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    await waitFor(() => {
      expect(screen.getByTestId("slug-status").textContent).toMatch(/taken/i);
    });
  });

  it("renders 'Available' when getTool rejects with 'Tool not found'", async () => {
    getToolMock.mockRejectedValue(new Error("Tool not found"));
    await act(async () => {
      mountWizard();
    });
    const slugInput = screen.getByLabelText(/MCP tool slug/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(slugInput, { target: { value: "fresh-slug" } });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    await waitFor(() => {
      expect(screen.getByTestId("slug-status").textContent).toMatch(/available/i);
    });
  });
});

describe("ToolPublishWizard - step 5 tab gating", () => {
  it("disables both Hosted and BYO tabs when feature flags are off", async () => {
    getToolConfigMock.mockResolvedValue({ byoEnabled: false, hostedEnabled: false });
    await act(async () => {
      mountWizard();
    });

    // Fill step 1.
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Title$/i), {
        target: { value: "Sample Tool" },
      });
      fireEvent.change(screen.getByLabelText(/MCP tool slug/i), {
        target: { value: "sample-tool" },
      });
      fireEvent.change(screen.getByLabelText(/^Description$/i), {
        target: { value: "hi" },
      });
      fireEvent.change(screen.getByLabelText(/Description for model/i), {
        target: { value: "model desc" },
      });
    });
    // wait for slug check
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    await waitFor(() => {
      expect(screen.getByTestId("slug-status").textContent).toMatch(/available/i);
    });

    // Step through to step 5 (Execution). Steps: 0 Basics, 1 Input, 2 Output,
    // 3 Pricing, 4 Execution.
    await act(async () => {
      fireEvent.click(screen.getByTestId("next-button")); // to 1
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("next-button")); // to 2
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("next-button")); // to 3
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("next-button")); // to 4 (Execution)
    });

    const hostedTab = screen.getByTestId("hosted-tab") as HTMLButtonElement;
    const byoTab = screen.getByTestId("byo-tab") as HTMLButtonElement;
    expect(hostedTab.disabled).toBe(true);
    expect(byoTab.disabled).toBe(true);
  });
});

describe("ToolPublishWizard - autosave", () => {
  it("writes the draft to localStorage under the wallet-scoped key", async () => {
    await act(async () => {
      mountWizard();
    });
    const titleInput = screen.getByLabelText(/^Title$/i) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: "My Tool" } });
    });
    // Wait past the 300ms debounce.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    const key = `weavrn:tool-wizard:${WALLET.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { title?: string };
    expect(parsed.title).toBe("My Tool");
  });
});

describe("ToolPublishWizard - publish happy path", () => {
  it("calls createListing with the full MCP payload on Publish", async () => {
    createListingMock.mockResolvedValue({ id: 1 });
    // Stub window.location so the redirect assignment does not explode.
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });

    await act(async () => {
      mountWizard();
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Title$/i), {
        target: { value: "Happy Tool" },
      });
      fireEvent.change(screen.getByLabelText(/MCP tool slug/i), {
        target: { value: "happy-tool" },
      });
      fireEvent.change(screen.getByLabelText(/^Description$/i), {
        target: { value: "Happy description" },
      });
      fireEvent.change(screen.getByLabelText(/Description for model/i), {
        target: { value: "Model-facing description" },
      });
    });

    // Wait for slug availability.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    await waitFor(() => {
      expect(screen.getByTestId("slug-status").textContent).toMatch(/available/i);
    });

    // Advance 5 times to reach Review (index 5).
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        fireEvent.click(screen.getByTestId("next-button"));
      });
    }

    // Publish.
    await act(async () => {
      fireEvent.click(screen.getByTestId("publish-button"));
    });

    await waitFor(() => {
      expect(createListingMock).toHaveBeenCalledTimes(1);
    });

    const [, wallet, body] = createListingMock.mock.calls[0] as [
      unknown,
      string,
      Record<string, unknown>,
    ];
    expect(wallet).toBe(WALLET);
    expect(body.title).toBe("Happy Tool");
    expect(body.mcp_tool_slug).toBe("happy-tool");
    expect(body.description).toBe("Happy description");
    expect(body.description_for_model).toBe("Model-facing description");
    expect(body.execution_mode).toBe("manual");
    expect(body).toHaveProperty("input_schema");
    expect(body).toHaveProperty("output_schema");
    expect(body).toHaveProperty("output_content_type");
    expect(body).toHaveProperty("timeout_seconds");
    expect(body).toHaveProperty("max_input_bytes");
    expect(body).toHaveProperty("max_output_bytes");
    expect(body).toHaveProperty("auto_release_on_delivery");
  });
});
