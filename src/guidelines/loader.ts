import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { Guideline, GuidelinesMap } from "./types";
import fs from "fs";
import path from "path";

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

console.error("🔧 Environment loaded - Base URL:", process.env.CONFLUENCE_BASE_URL);

const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const EMAIL = process.env.CONFLUENCE_EMAIL!;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN!;
const MAIN_PAGE_ID = process.env.CONFLUENCE_MAIN_PAGE_ID!;
// if (!MAIN_PAGE_ID) throw new Error("Environment variable MAIN_PAGE_ID is not set.");

// Helper: returns the authorization header
function getAuthHeader() {
  const creds = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
  return { Authorization: `Basic ${creds}` };
}

// Fetch a Confluence page by ID
type PageContent = { html: string; title: string };
async function fetchPageContent(pageId: string): Promise<PageContent> {
  const url = `${BASE_URL}/rest/api/content/${pageId}?expand=body.view`;
  const res = await fetch(url, { headers: getAuthHeader() });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch page ${pageId}: ${res.status} ${res.statusText} - ${errorText}`);
  }
  const data: any = await res.json();
  return { html: data.body.view.value, title: data.title };
}

// Object to store all guidelines
export const guidelines: GuidelinesMap = {};

// Helper: fetch child page IDs for a given page
async function fetchChildPageIds(pageId: string): Promise<string[]> {
  const url = `${BASE_URL}/rest/api/content/${pageId}/child/page`;
  const res = await fetch(url, { headers: getAuthHeader() });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch child pages for ${pageId}: ${res.status} ${res.statusText} - ${errorText}`);
  }
  const data: any = await res.json();
  if (!data.results) return [];
  return data.results.map((page: any) => page.id);
}

// Load only guideline pages linked from the main page
export async function loadGuidelines(): Promise<GuidelinesMap> {
  console.error(`🔄 Loading guidelines from page ID: ${MAIN_PAGE_ID}`);
  // Fetch main page content and title
  const mainPage: PageContent = await fetchPageContent(MAIN_PAGE_ID!);
  const $main = cheerio.load(mainPage.html);
  const mainTitle = mainPage.title || `Main Page (${MAIN_PAGE_ID})`;
  const mainText = $main.text().replace(/\s+/g, ' ').trim();
  const mainUrl = `${BASE_URL}/pages/${MAIN_PAGE_ID}`;

  // Try to fetch child page IDs
  let childPageIds: string[] = [];
  try {
    childPageIds = await fetchChildPageIds(MAIN_PAGE_ID!);
  } catch (err) {
    console.error(`❌ Failed to fetch child pages for main page:`, err);
  }

  if (childPageIds.length === 0) {
    // No child pages, treat main page as a single resource
    guidelines[mainTitle] = {
      title: mainTitle,
      text: `${mainText}\nURL: ${mainUrl}`,
      url: mainUrl
    };
    console.error(`✅ Loaded main page as single guideline resource: ${mainTitle}`);
  } else {
    // Main page itself as a resource
    guidelines[mainTitle] = {
      title: mainTitle,
      text: `${mainText}\nURL: ${mainUrl}`,
      url: mainUrl
    };
    console.error(`✅ Loaded main page as guideline resource: ${mainTitle}`);

    // Each child page as a separate resource, using Confluence page title as key
    for (const childId of childPageIds) {
      try {
        const childPage: PageContent = await fetchPageContent(childId);
        const $child = cheerio.load(childPage.html);
        const childTitle = childPage.title || `Child Page (${childId})`;
        const childText = $child.text().replace(/\s+/g, ' ').trim();
        const childUrl = `${BASE_URL}/pages/${childId}`;
        guidelines[childTitle] = {
          title: childTitle,
          text: `${childText}\nURL: ${childUrl}`,
          url: childUrl
        };
        console.error(`✅ Loaded child guideline: ${childTitle}`);
      } catch (err) {
        console.error(`❌ Failed to load child page ${childId}:`, err);
      }
    }
  }

  Object.assign(guidelines);
  console.error(`📋 Total guidelines loaded: ${Object.keys(guidelines).length}`);
  return guidelines;
}

