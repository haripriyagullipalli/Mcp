import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { Guideline, GuidelinesMap } from "./types";
import path from "path";
import { logger } from "../utils/logger";

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.CONFLUENCE_BASE_URL;
const EMAIL = process.env.CONFLUENCE_EMAIL;
const API_TOKEN = process.env.CONFLUENCE_API_TOKEN;
const MAIN_PAGE_ID = process.env.CONFLUENCE_MAIN_PAGE_ID;

if (!BASE_URL || !EMAIL || !API_TOKEN || !MAIN_PAGE_ID) {
  throw new Error(
    "Missing required environment variables: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN, CONFLUENCE_MAIN_PAGE_ID"
  );
}

logger.debug(`Confluence configuration loaded - Base URL: ${BASE_URL}`);

// Store all loaded guidelines
export const guidelines: GuidelinesMap = {};

/**
 * Returns the authorization header for Confluence API requests
 */
function getAuthHeader(): { Authorization: string } {
  const creds = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
  return { Authorization: `Basic ${creds}` };
}

type PageContent = { html: string; title: string };

/**
 * Fetches a Confluence page by ID
 */
async function fetchPageContent(pageId: string): Promise<PageContent> {
  const url = `${BASE_URL}/rest/api/content/${pageId}?expand=body.view`;
  const res = await fetch(url, { headers: getAuthHeader() });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to fetch page ${pageId}: ${res.status} ${res.statusText} - ${errorText}`
    );
  }
  
  const data: any = await res.json();
  return { html: data.body.view.value, title: data.title };
}

/**
 * Fetches child page IDs for a given Confluence page
 */
async function fetchChildPageIds(pageId: string): Promise<string[]> {
  const url = `${BASE_URL}/rest/api/content/${pageId}/child/page`;
  const res = await fetch(url, { headers: getAuthHeader() });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to fetch child pages for ${pageId}: ${res.status} ${res.statusText} - ${errorText}`
    );
  }
  
  const data: any = await res.json();
  return data.results?.map((page: any) => page.id) || [];
}

/**
 * Loads guidelines from Confluence
 * Fetches the main page and all its child pages, storing them by page ID
 */
export async function loadGuidelines(): Promise<GuidelinesMap> {
  const pageId = MAIN_PAGE_ID!;
  logger.info(`Loading guidelines from Confluence page: ${pageId}`);

  try {
    // Fetch main page
    const mainPage = await fetchPageContent(pageId);
    const $main = cheerio.load(mainPage.html);
    const mainTitle = mainPage.title || `Main Page (${pageId})`;
    const mainText = $main.text().replace(/\s+/g, ' ').trim();
    const mainUrl = `${BASE_URL}/pages/${pageId}`;

    // Store main page
    guidelines[pageId] = {
      title: mainTitle,
      text: `${mainText}\nURL: ${mainUrl}`,
      url: mainUrl,
    };
    logger.debug(`Loaded main page: ${mainTitle}`);

    // Fetch child pages
    let childPageIds: string[] = [];
    try {
      childPageIds = await fetchChildPageIds(pageId);
    } catch (err) {
      logger.warn(`Failed to fetch child pages`, err);
    }

    // Load each child page
    if (childPageIds.length > 0) {
      logger.info(`Loading ${childPageIds.length} child page(s)...`);

      for (const childId of childPageIds) {
        try {
          const childPage = await fetchPageContent(childId);
          const $child = cheerio.load(childPage.html);
          const childTitle = childPage.title || `Child Page (${childId})`;
          const childText = $child.text().replace(/\s+/g, ' ').trim();
          const childUrl = `${BASE_URL}/pages/${childId}`;

          guidelines[childId] = {
            title: childTitle,
            text: `${childText}\nURL: ${childUrl}`,
            url: childUrl,
          };
          logger.debug(`Loaded child page: ${childTitle}`);
        } catch (err) {
          logger.error(`Failed to load child page ${childId}`, err);
        }
      }
    }

    const totalLoaded = Object.keys(guidelines).length;
    logger.info(`Successfully loaded ${totalLoaded} guideline(s)`);

    // Log detailed info only in debug mode
    if (process.env.LOG_LEVEL === 'DEBUG') {
      logger.debug('=== LOADED GUIDELINES ===');
      Object.entries(guidelines).forEach(([id, guideline], index) => {
        logger.debug(`${index + 1}. [${id}] ${guideline.title}`);
      });
      logger.debug('=========================');
    }

    return guidelines;
  } catch (error) {
    logger.error('Failed to load guidelines from Confluence', error);
    throw error;
  }
}

