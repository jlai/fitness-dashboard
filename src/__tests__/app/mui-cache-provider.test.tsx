import { render } from "@testing-library/react";
import Button from "@mui/material/Button";

import { MuiCacheProvider } from "@/app/mui-cache-provider";

describe("MuiCacheProvider", () => {
  afterEach(() => {
    document.querySelectorAll("style[data-emotion]").forEach((style) => {
      style.remove();
    });
  });

  it("adds the CSP nonce to Emotion style tags", () => {
    render(
      <MuiCacheProvider nonce="test-nonce">
        <Button>Click</Button>
      </MuiCacheProvider>,
    );

    const emotionStyles = document.querySelectorAll("style[data-emotion]");

    expect(emotionStyles.length).toBeGreaterThan(0);
    emotionStyles.forEach((style) => {
      expect(style.getAttribute("nonce")).toBe("test-nonce");
    });
  });

  it("keeps the first document nonce if a later render passes a new one", () => {
    const { rerender } = render(
      <MuiCacheProvider nonce="document-nonce">
        <Button>First</Button>
      </MuiCacheProvider>,
    );

    rerender(
      <MuiCacheProvider nonce="rsc-nonce">
        <Button variant="contained">Second</Button>
      </MuiCacheProvider>,
    );

    const emotionStyles = document.querySelectorAll("style[data-emotion]");

    expect(emotionStyles.length).toBeGreaterThan(0);
    emotionStyles.forEach((style) => {
      expect(style.getAttribute("nonce")).toBe("document-nonce");
      expect(style.getAttribute("nonce")).not.toBe("rsc-nonce");
    });
  });
});
