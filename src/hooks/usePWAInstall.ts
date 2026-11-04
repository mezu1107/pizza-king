import { useEffect } from "react";

/**
 * Injects a scope-specific manifest <link> + theme color into <head>.
 * Used by Admin and Rider layouts so each can be installed as its own PWA.
 */
export function usePWAManifest(href: string, themeColor = "#e85d3a") {
  useEffect(() => {
    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    // Don't try to install inside Lovable preview iframe — but the manifest link is harmless.
    // We just skip the actual prompt logic there.

    const head = document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      head.appendChild(link);
    }
    const prevHref = link.href;
    link.href = href;

    let theme = head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      head.appendChild(theme);
    }
    const prevTheme = theme.content;
    theme.content = themeColor;

    return () => {
      // Restore so other routes don't get the wrong manifest
      if (link && prevHref) link.href = prevHref;
      if (theme && prevTheme) theme.content = prevTheme;
    };
  }, [href, themeColor]);
}
