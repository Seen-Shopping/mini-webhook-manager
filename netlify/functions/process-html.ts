import { Handler } from "@netlify/functions";
import { Cheerio, CheerioAPI, load as cheerioLoad } from "cheerio";

import type { Element } from "cheerio";
import {
  getChatCompletionAsJSON,
  getChatCompletionAsString,
} from "./utils/openai";
// ------------------------------
// External services (mocked stubs)
// In production, replace with your actual implementations.
// ------------------------------

async function findRulesForDomain(domain: string) {
  // E.g. make a DB call or API call
  return null; // return { domain, ...some rules } if found
}

async function addRulesForDomain(domain: string, rules: any) {
  // E.g. store in DB
  console.log("Adding rules for domain:", domain, rules);
}

async function updateRulesForDomain(domain: string, rules: any) {
  // E.g. update DB
  console.log("Updating rules for domain:", domain, rules);
}

// ------------------------------
// LLM Integration (mocked)
// ------------------------------

async function callLLMForRepeatingItemSelector(
  domSummary: string
): Promise<{ repeatingItemSelector: string; reason: string }> {
  const systemPrompt = `You are a e-commerce web scraping expert. You are given a summary of the DOM of a website and you are asked to find the the CSS selector of the
  repeating item on the page.
   
  [TASK]
   You are given a high-level, text-based structural summary of a webpage’s DOM. 
   The page is a product listing page for an e-commerce site. 
   Your task is to identify the DOM element (using a CSS selector) that most likely contains the entire set of product items. 
   provide the CSS selector of the repeating element that is likely the item. 

  The selector should be the repeating element that is likely the item. 

  OUTPUT SHOULD BE JSON {repeatingItemSelector: string, reason:string}
`;
  const userPrompt = `Here is the summary of the DOM: ${domSummary}`;
  const response = (await getChatCompletionAsJSON(
    systemPrompt,
    userPrompt
  )) as { repeatingItemSelector: string; reason: string };
  return response;
}

async function callLLMForStableSelectors(singleItemHTML: string): Promise<{
  itemDataSelector: string;
  imageSelector: { parentLevels: number; selector: string };
}> {
  const systemPrompt = `You are a e-commerce web scraping expert.
   
  You are an e-commerce web scraping expert.

[TASK]  
You are given an HTML chunk representing a single product in a list of products on a search page. Your task is to:  
1. Identify the most appropriate CSS selector for the element containing **ALL relevant product data**: name, price, product URL, and brand (if present), while **excluding the product image unless it is strictly necessary** to access the required data.  
2. Provide a separate CSS selector for the **product image**, relative to the product data selector.

[INSTRUCTIONS]  
- The itemDataSelector should focus only on encapsulating the product data (name, price, product URL, and brand) without including the product image or unrelated elements.  
- The product image selector (imageSelector) should reference the image separately using a relative path from the itemDataSelector.  
- **Exclude images from itemDataSelector unless absolutely necessary** to extract the product name, price, URL, or brand.  
- Go as deep as possible into the DOM to minimize unrelated HTML context, while ensuring that all product data is encapsulated.  
- Focus on using robust and reusable selectors (e.g., meaningful class names, attributes like data-*). Avoid relying on dynamic, overly specific, or fragile properties.  
- If using dynamic class names, use ^= or $= to match prefixes or suffixes only if those properties are consistent across similar items. Avoid including unique parts of the class name.  
- Avoid overly generic selectors (e.g., div > span) unless they are stable and consistent across all products in the list.

[OUTPUT]  
Output should be in JSON format as follows:  

{
  "itemDataSelector": "<string>",
  "imageSelector": {
    "parentLevels": <number>,
    "selector": "<string>"
  }
}


  [EXAMPLES]
  [EXAMPLE 1]
  <div class="product-card">
  <div class="product-data">
    <a class="product-name" href="/item/123">Product Name</a>
    <span class="product-price">$99.99</span>
    <span class="brand-name">Brand A</span>
  </div>
  <div class="product-image">
    <img src="/images/item123.jpg" alt="Product Image">
  </div>
</div>
  [EXAMPLE 1 OUTPUT]
  {
  "itemDataSelector": "div.product-card > div.product-data",
  "imageSelector": {
    "parentLevels": 1,
    "selector": "div.product-image img"
  }
}

  [EXAMPLE 2]
  <div class="item">
  <div class="item-details">
    <a href="/product/456" class="title">Product B</a>
    <span class="price">$49.99</span>
  </div>
  <img src="/images/item456.jpg" class="thumbnail">
</div>
  [EXAMPLE 2 OUTPUT]
  {
  "itemDataSelector": "div.item > div.item-details",
  "imageSelector": {
    "parentLevels": 1,
    "selector": "img.thumbnail"
  }
}
`;
  const userPrompt = `Here is the HTML of a single product item: ${singleItemHTML}`;
  const response = (await getChatCompletionAsJSON(
    systemPrompt,
    userPrompt
  )) as {
    itemDataSelector: string;
    imageSelector: { parentLevels: number; selector: string };
  };
  return response;
}

// ------------------------------
// DOM Processing
// ------------------------------

function pruneIrrelevantSections($: CheerioAPI) {
  $(
    "nav, footer, script, style, link, head, noscript, #footer, #footer-container, #nav, #nav-container, #header, #header-container, menu, #menu, meta, title, header"
  ).remove();
}

/**
 * Summarize DOM by showing structure in a compact form.
 * For siblings that share the same tag and a similar structure at the same depth,
 * represent them as one node plus a count.
 *
 * This helps keep the prompt small.
 */
interface SummarizedNode {
  tag: string;
  id?: string;
  classes?: string[];
  dataAttributes?: Record<string, string>;
  childCount: number;
  repeatedSiblingCount?: number;
  children?: SummarizedNode[];
}

/**
 * Convert the summarized DOM structure into a human-readable, indented textual form.
 * This reduces JSON braces and quotes, making it clearer and cheaper in tokens.
 */
function stringifyDomSummary(
  nodes: SummarizedNode[],
  indentLevel: number = 0
): string {
  const indent = "-".repeat(indentLevel);
  return nodes
    .map((node) => {
      const parts: string[] = [];

      // Base: tag
      let base = node.tag;

      // Add ID if present
      if (node.id) {
        base += `#${node.id}`;
      }

      // Add classes if present
      if (node.classes && node.classes.length > 0) {
        base += "." + node.classes.join(".");
      }

      parts.push(base);

      // Add data attributes if present
      if (node.dataAttributes && Object.keys(node.dataAttributes).length > 0) {
        const dataStr = Object.entries(node.dataAttributes)
          .map(([k, v]) => `${k}=${v}`)
          .join(" ");
        parts.push(`{${dataStr}}`);
      }

      // Add childCount if > 0
      if (node.childCount > 0) {
        parts.push(`(children=${node.childCount})`);
      }

      // Add repeatedSiblingCount if present
      if (node.repeatedSiblingCount && node.repeatedSiblingCount > 1) {
        parts.push(`(x${node.repeatedSiblingCount})`);
      }

      // Combine current node line
      let line = indent + parts.join(" ");

      // If children exist, recurse
      if (node.children && node.children.length > 0) {
        line += "\n" + stringifyDomSummary(node.children, indentLevel + 1);
      }

      return line;
    })
    .join("\n");
}

function summarizeDOM(
  $: CheerioAPI,
  element: Cheerio<Element>,
  maxDepth = 10,
  depth = 0
): SummarizedNode[] {
  if (depth > maxDepth) return [];

  // Group siblings by a signature (tag + class + data attributes)
  const groups: { [key: string]: { elements: Cheerio<Element> } } = {};

  element.each((_, el) => {
    const $el = $(el);
    const tag = el.tagName;
    const classes = ($el.attr("class") || "").split(/\s+/).sort().join(".");
    const dataAttrs = Object.keys(el.attribs)
      .filter((a) => a.startsWith("data-"))
      .sort()
      .join("|");

    const signature = `${tag}|${classes}|${dataAttrs}`;
    if (!groups[signature]) {
      groups[signature] = { elements: $el };
    } else {
      groups[signature].elements = groups[signature].elements.add($el);
    }
  });

  const result: SummarizedNode[] = [];

  for (const signature in groups) {
    const $groupElems = groups[signature].elements;
    const first = $groupElems.first();
    const el = first.get(0);
    if (!el) continue;

    const tag = el.tagName;
    const classes = (first.attr("class") || "").split(/\s+/).filter(Boolean);
    const dataAttributes: Record<string, string> = {};
    for (const [attr, val] of Object.entries(el.attribs)) {
      if (attr.startsWith("data-")) {
        dataAttributes[attr] = val;
      }
    }

    const node: SummarizedNode = {
      tag,
      id: first.attr("id") || undefined,
      classes: classes.length ? classes : undefined,
      dataAttributes: Object.keys(dataAttributes).length
        ? dataAttributes
        : undefined,
      childCount: first.children().length,
    };

    const count = $groupElems.length;
    if (count > 1) {
      node.repeatedSiblingCount = count;
    }

    if (first.children().length > 0 && depth < maxDepth) {
      node.children = summarizeDOM($, first.children(), maxDepth, depth + 1);
    }

    result.push(node);
  }

  return result;
}

/**
 * Extract only one product item from the container.
 */
function extractSingleItemInstance(
  $: CheerioAPI,
  repeatingItemSelector: string
): string {
  const allItems = $(repeatingItemSelector);
  const parent = allItems.parent();
  if (allItems.length === 0) return "";
  // Keep only the first item
  let firstItem = allItems.first().html()?.trim();
  if (!firstItem) return "";
  firstItem = firstItem.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  firstItem = firstItem.replace(/\s{2,}/g, " ").replace(/\n{2,}/g, "\n");
  return firstItem;
}

// ------------------------------
// Main handler
// ------------------------------

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: "Missing body in the request",
    };
  }

  try {
    const domain = event.queryStringParameters?.domain;
    if (!domain) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'url' parameter" }),
      };
    }
    const html = event.body;

    // 1) Check existing rules
    let existingRules = await findRulesForDomain(domain);
    if (existingRules) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Rules already exist",
          rules: existingRules,
        }),
      };
    }

    // 3) Parse & prune
    let $ = cheerioLoad(html);
    pruneIrrelevantSections($);

    // 4) Summarize DOM for LLM
    const body = $("body").first();
    const summary = summarizeDOM($, body);

    const { repeatingItemSelector, reason } =
      await callLLMForRepeatingItemSelector(stringifyDomSummary(summary));

    // 6) Extract container with single item instance
    const singleItemHTML = extractSingleItemInstance($, repeatingItemSelector);

    console.log(singleItemHTML);

    if (!singleItemHTML) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No product items found in identified container.",
        }),
      };
    }

    // 7) Call LLM for stable selectors (focusing on image for now)
    const stableSelectors = await callLLMForStableSelectors(singleItemHTML);

    // 8) Store the resulting configuration
    const newRules = {
      itemDataSelector: stableSelectors.itemDataSelector,
      imageSelector: stableSelectors.imageSelector,
    };

    await addRulesForDomain(domain, newRules);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Rules added", domain, rules: newRules }),
    };
  } catch (err: any) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
};
