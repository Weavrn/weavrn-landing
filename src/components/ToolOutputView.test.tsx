import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ToolOutputView from "./ToolOutputView";
import type { JSONSchema } from "../lib/schema-form";

function installClipboardMock(): { writeText: ReturnType<typeof vi.fn> } {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return { writeText };
}

describe("ToolOutputView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders text content inside a <pre> with a Copy button", async () => {
    const { writeText } = installClipboardMock();
    const data = {
      tool_slug: "echo",
      output: "hello world",
      content_type: "text",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="text" />);

    const pre = screen.getByTestId("tool-output-text");
    expect(pre.tagName).toBe("PRE");
    expect(pre.textContent).toBe("hello world");

    const button = screen.getByRole("button", { name: /copy output/i });
    expect(button.textContent).toBe("Copy");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith("hello world");

    await waitFor(() => {
      expect(button.textContent).toBe("Copied!");
    });

    // Label reverts after ~1.5 s. Use a real timer wait (bounded) to avoid
    // coupling this assertion to fake-timer plumbing — the main invariant
    // we care about is "showed Copied! then reverted".
    await waitFor(
      () => {
        expect(button.textContent).toBe("Copy");
      },
      { timeout: 2500 },
    );
  });

  it("stringifies an object payload when contentType is text", () => {
    const data = {
      tool_slug: "summarize",
      output: { title: "hi", body: "there" },
      content_type: "text",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="text" />);

    const pre = screen.getByTestId("tool-output-text");
    expect(pre.textContent).toContain('"title": "hi"');
  });

  it("renders JSON with indentation when contentType is 'json'", () => {
    const data = {
      tool_slug: "classify",
      output: { label: "cat", confidence: 0.92 },
      content_type: "json",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="json" />);

    const pre = screen.getByTestId("tool-output-json");
    const expected = JSON.stringify({ label: "cat", confidence: 0.92 }, null, 2);
    expect(pre.textContent).toBe(expected);
    expect(screen.getByRole("button", { name: /copy output/i })).toBeTruthy();
  });

  it("falls back to JSON rendering when contentType is undefined", () => {
    const data = {
      tool_slug: "classify",
      output: { k: 1 },
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} />);

    const pre = screen.getByTestId("tool-output-json");
    expect(pre.textContent).toBe(JSON.stringify({ k: 1 }, null, 2));
  });

  it("renders <img> with image_url and a Download link for image/png", () => {
    const data = {
      tool_slug: "dalle",
      output: { image_url: "https://cdn.example.com/cat.png", seed: 42 },
      content_type: "image/png",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="image/png" />);

    const img = screen.getByTestId("tool-output-image") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/cat.png");
    expect(img.getAttribute("alt")).toBe("dalle");

    const dl = screen.getByRole("link", { name: /download/i }) as HTMLAnchorElement;
    expect(dl.getAttribute("href")).toBe("https://cdn.example.com/cat.png");
    expect(dl.getAttribute("download")).toBe("dalle.png");
  });

  it("renders <audio controls> with audio_url for audio/mpeg", () => {
    const data = {
      tool_slug: "tts",
      output: { audio_url: "https://cdn.example.com/voice.mp3" },
      content_type: "audio/mpeg",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="audio/mpeg" />);

    const audio = screen.getByTestId("tool-output-audio") as HTMLAudioElement;
    expect(audio.tagName).toBe("AUDIO");
    expect(audio.hasAttribute("controls")).toBe(true);
    expect(audio.getAttribute("src")).toBe("https://cdn.example.com/voice.mp3");

    const dl = screen.getByRole("link", { name: /download/i }) as HTMLAnchorElement;
    expect(dl.getAttribute("download")).toBe("tts.mp3");
  });

  it("renders <video controls> with video_url for video/mp4", () => {
    const data = {
      tool_slug: "render",
      output: { video_url: "https://cdn.example.com/clip.mp4" },
      content_type: "video/mp4",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="video/mp4" />);

    const video = screen.getByTestId("tool-output-video") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.getAttribute("src")).toBe("https://cdn.example.com/clip.mp4");

    const dl = screen.getByRole("link", { name: /download/i }) as HTMLAnchorElement;
    expect(dl.getAttribute("download")).toBe("render.mp4");
  });

  it("renders only a download button (no preview) for application/octet-stream with top-level output_url", () => {
    const data = {
      tool_slug: "compiler",
      output: {},
      output_url: "https://cdn.example.com/build.bin",
      content_type: "application/octet-stream",
      format: "tool_output_v1",
    };

    render(
      <ToolOutputView
        deliverableData={data}
        contentType="application/octet-stream"
      />,
    );

    expect(screen.queryByTestId("tool-output-image")).toBeNull();
    expect(screen.queryByTestId("tool-output-audio")).toBeNull();
    expect(screen.queryByTestId("tool-output-video")).toBeNull();
    expect(screen.queryByTestId("tool-output-text")).toBeNull();
    expect(screen.queryByTestId("tool-output-json")).toBeNull();

    const dl = screen.getByRole("link", { name: /download/i }) as HTMLAnchorElement;
    expect(dl.getAttribute("href")).toBe("https://cdn.example.com/build.bin");
    expect(dl.getAttribute("download")).toBe("compiler.bin");
  });

  it("resolves URL via outputSchema property with format:'uri' when conventional fields are absent", () => {
    const data = {
      tool_slug: "scan",
      output: { report_link: "https://cdn.example.com/report.png" },
      content_type: "image/png",
      format: "tool_output_v1",
    };
    const outputSchema: JSONSchema = {
      type: "object",
      properties: {
        report_link: { type: "string", format: "uri" },
        notes: { type: "string" },
      },
    };

    render(
      <ToolOutputView
        deliverableData={data}
        contentType="image/png"
        outputSchema={outputSchema}
      />,
    );

    const img = screen.getByTestId("tool-output-image") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/report.png");
  });

  it("renders the 'No output' card when deliverableData is null", () => {
    render(<ToolOutputView deliverableData={null} contentType="image/png" />);
    expect(screen.getByText(/no output/i)).toBeTruthy();
  });

  it("renders the 'No output' card when deliverableData is malformed (not an object)", () => {
    render(<ToolOutputView deliverableData={"raw string"} contentType="json" />);
    expect(screen.getByText(/no output/i)).toBeTruthy();
  });

  it("renders the error card when binary mode has no resolvable URL", () => {
    const data = {
      tool_slug: "scan",
      output: { notes: "no link here" },
      content_type: "image/png",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="image/png" />);
    expect(screen.getByText(/output url missing/i)).toBeTruthy();
    expect(screen.queryByTestId("tool-output-image")).toBeNull();
  });

  it("falls back to deliverableData.content_type when contentType prop is omitted", () => {
    const data = {
      tool_slug: "say",
      output: "hi",
      content_type: "text",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} />);
    const pre = screen.getByTestId("tool-output-text");
    expect(pre.textContent).toBe("hi");
  });

  it("uses 'tool-output' as filename base when tool_slug is absent", () => {
    const data = {
      output: { image_url: "https://cdn.example.com/x.png" },
      content_type: "image/png",
      format: "tool_output_v1",
    };

    render(<ToolOutputView deliverableData={data} contentType="image/png" />);
    const dl = screen.getByRole("link", { name: /download/i }) as HTMLAnchorElement;
    expect(dl.getAttribute("download")).toBe("tool-output.png");
  });
});
