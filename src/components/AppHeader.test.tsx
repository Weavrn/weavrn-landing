import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppHeader from "./AppHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("./WalletConnect", () => ({
  default: () => <div data-testid="wallet-connect" />,
}));

describe("AppHeader", () => {
  it("renders a Tools link pointing at /tools in the desktop nav", () => {
    render(<AppHeader showWallet={false} />);

    const toolsLinks = screen
      .getAllByRole("link")
      .filter((a) => a.textContent?.trim() === "Tools");

    expect(toolsLinks.length).toBeGreaterThan(0);
    for (const link of toolsLinks) {
      expect(link.getAttribute("href")).toBe("/tools");
    }
  });
});
