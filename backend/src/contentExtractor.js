import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { fetch } from "undici";

export async function extractArticle(url) {
  try {
    // 1) Fetch webpage HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 VoiceNav Bot"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // 2) Load HTML into JSDOM
    const dom = new JSDOM(html, { url });

    // 3) Create Readability parser
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return {
        title: "",
        text: "",
        byline: "",
        length: 0,
        sections: []
      };
    }

    // 4) Prepare sectioned content (optional)
    const sections = [];
    const doc = dom.window.document;

    doc.querySelectorAll("h1, h2, h3").forEach((heading) => {
      const sectionTitle = heading.textContent?.trim() || "";
      let next = heading.nextElementSibling;
      let content = [];

      while (next && !/^H[1-3]$/.test(next.tagName)) {
        content.push(next.textContent || "");
        next = next.nextElementSibling;
      }

      const body = content.join("\n").trim();
      if (sectionTitle && body) {
        sections.push({
          title: sectionTitle,
          body: body
        });
      }
    });

    // 5) Clean main article text
    const cleanedText = article.textContent
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // 6) Return final structured result
    return {
      title: article.title || "",
      byline: article.byline || "",
      text: cleanedText,
      length: cleanedText.length,
      sections
    };

  } catch (err) {
    console.error("Extractor Error:", err);
    return {
      title: "",
      text: "",
      byline: "",
      length: 0,
      sections: [],
      error: err.message
    };
  }
}
