"use server";

import { prisma } from "../utils/prisma";
import { analyzeJobCandidacyAction } from "./ai-actions";
import { addJobPostAction } from "./db-actions";
import { JobStatus } from "@prisma/client";

// Retrieve the Apify API token from environment variables
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

export interface ApifyRunResult {
  runId: string;
  status: string;
  datasetId?: string;
  error?: string;
}

export interface LinkedInJobItem {
  title?: string;
  position?: string;
  company?: string;
  companyName?: string;
  location?: string;
  description?: string;
  jobDescription?: string;
  descriptionHtml?: string;
  url?: string;
  jobUrl?: string;
  link?: string;
  id?: string;             // LinkedIn's own numeric job ID — primary dedup key
  postedAt?: string;
  postDate?: string;
}

export interface ProcessedJobSummary {
  title: string;
  company: string;
  score: number;
  url: string;
  imported: boolean;
  reason?: string;
  dbId?: string;
}

export interface SyncStatus {
  success: boolean;
  message: string;
  jobsProcessed?: number;
  jobsImported?: number;
  jobsSkipped?: number;
  processedJobs?: ProcessedJobSummary[];
  error?: string;
}

/**
 * Triggers the Apify LinkedIn Jobs Scraper actor.
 * Returns the Run ID and initial status.
 */
export async function startLinkedinScrapeAction(
  query: string,
  jobType: string = "contract",
  limit: number = 10,
  userEmail?: string,
  source: "jobs" | "posts" = "jobs"
): Promise<{ success: boolean; data?: ApifyRunResult; error?: string }> {
  try {
    if (!APIFY_API_TOKEN) {
      return {
        success: false,
        error: "Apify API Token is not configured. Please add APIFY_API_TOKEN to your .env file.",
      };
    }

    if (source === "posts") {
      const actorName = "apimaestro~linkedin-posts-search-scraper-no-cookies";
      
      let dateFilter = "past-week";
      if (userEmail) {
        const lastSync = await prisma.linkedInSyncLog.findUnique({
          where: { userEmail_keyword_jobType: { userEmail, keyword: query, jobType } },
          select: { lastSyncAt: true },
        });

        if (lastSync) {
          const diffMs = Date.now() - lastSync.lastSyncAt.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours < 24) {
            dateFilter = "past-24h";
            console.log(`[Apify Scraper] Posts for "${query}" last synced ${diffHours.toFixed(1)}h ago. Using date_filter: "past-24h"`);
          }
        }
      }

      // Build search query for posts
      const postKeyword = `"${query}" AND "${jobType}"`;
      console.log(`[Apify Scraper] actor: ${actorName} | keyword: "${postKeyword}" | limit: ${limit} | dateFilter: ${dateFilter}`);

      const response = await fetch(
        `https://api.apify.com/v2/acts/${actorName}/runs?token=${APIFY_API_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: postKeyword,
            sort_type: "date_posted",
            limit: Math.max(10, limit),
            date_filter: dateFilter,
            excludeReposts: true,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apify API returned error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      const run = json.data;

      return {
        success: true,
        data: {
          runId: run.id,
          status: run.status,
          datasetId: run.defaultDatasetId,
        },
      };
    }

    // Map our jobType values → LinkedIn f_JT filter codes
    // C=Contract, P=Part-time, F=Full-time, I=Internship
    const jobTypeCodeMap: Record<string, string> = {
      contract:    "C",
      freelance:   "C", // Freelance uses Contract filter but appends "freelance" to query keywords
      "part-time": "P",
      "full-time": "F",
      internship:  "I",
    };
    const f_JT = jobTypeCodeMap[jobType] ?? "C";

    // Append "freelance" keyword if jobType is freelance
    let searchQuery = query;
    if (jobType === "freelance") {
      searchQuery = `${query} freelance`;
    }

    // Dynamic Time Posted Range: Default to past week (r604800 = 7 days)
    let f_TPR = "r604800";
    if (userEmail) {
      const lastSync = await prisma.linkedInSyncLog.findUnique({
        where: { userEmail_keyword_jobType: { userEmail, keyword: query, jobType } },
        select: { lastSyncAt: true },
      });

      if (lastSync) {
        const diffMs = Date.now() - lastSync.lastSyncAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        // If synced within the last 24 hours, request past 24 hours only.
        if (diffHours < 24) {
          f_TPR = "r86400"; // past 24 hours
          console.log(`[Apify Scraper] Keyword "${query}" last synced ${diffHours.toFixed(1)}h ago (within 24h). Optimizing LinkedIn filter: f_TPR=r86400 (Past 24 Hours)`);
        }
      }
    }

    // Build LinkedIn public jobs search URL (no login required)
    const linkedInUrl =
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&f_JT=${f_JT}&f_TPR=${f_TPR}&sortBy=DD&position=1&pageNum=0`;

    console.log(`[Apify Scraper] actor: curious_coder~linkedin-jobs-scraper | query: "${searchQuery}" | jobType: ${jobType} (${f_JT}) | limit: ${limit}`);
    console.log(`[Apify Scraper] LinkedIn URL: ${linkedInUrl}`);

    // curious_coder/linkedin-jobs-scraper — PAY_PER_EVENT $0.001/result, no rental needed
    const actorName = "curious_coder~linkedin-jobs-scraper";
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorName}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [linkedInUrl],          // Pass constructed LinkedIn search URL
          count: Math.max(10, limit),   // Actor requires count >= 10
          scrapeCompany: false,         // Skip company deep-dive (faster + cheaper)
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify API returned error: ${response.status} - ${errorText}`);
    }

    const json = await response.json();
    const run = json.data;

    return {
      success: true,
      data: {
        runId: run.id,
        status: run.status,
        datasetId: run.defaultDatasetId,
      },
    };
  } catch (error: any) {
    console.error("[Apify Scraper] Error starting run:", error);
    return {
      success: false,
      error: error.message || "Failed to trigger Apify scraper",
    };
  }
}

/**
 * Checks the status of an active Apify run.
 */
export async function getScrapeStatusAction(
  runId: string
): Promise<{ success: boolean; data?: ApifyRunResult; error?: string }> {
  try {
    if (!APIFY_API_TOKEN) {
      throw new Error("Apify API Token is not configured.");
    }

    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Apify API returned status ${response.status}`);
    }

    const json = await response.json();
    const run = json.data;

    return {
      success: true,
      data: {
        runId: run.id,
        status: run.status,
        datasetId: run.defaultDatasetId,
      },
    };
  } catch (error: any) {
    console.error("[Apify Scraper] Error checking run status:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch run status",
    };
  }
}

/**
 * Fetches the items from the Apify dataset, parses them, 
 * runs Gemini candidacy checks, and saves successful matches.
 */
export async function fetchAndProcessJobsAction(
  datasetId: string,
  userEmail: string,
  keyword: string = "",
  jobType: string = "contract",
  source: "jobs" | "posts" = "jobs"
): Promise<SyncStatus> {
  try {
    if (!APIFY_API_TOKEN) {
      throw new Error("Apify API Token is not configured.");
    }

    console.log(`[Apify Scraper] Fetching dataset items for ID: ${datasetId}`);

    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dataset items: ${response.statusText}`);
    }

    const items = (await response.json()) as LinkedInJobItem[];
    console.log(`[Apify Scraper] Fetched ${items.length} raw job items from Apify`);

    let jobsProcessed = 0;
    let jobsImported = 0;
    let jobsSkipped = 0;
    const processedJobs: ProcessedJobSummary[] = [];

    for (const item of items) {
      jobsProcessed++;

      // Defensive field mapping
      const title = item.title || item.position || ((item as any).text ? ((item as any).text.replace(/\r?\n/g, " ").slice(0, 50) + "...") : "Unknown Freelance Role");
      const company = item.company || item.companyName || (item as any).authorName || (item as any).postedBy || (item as any).author?.name || "Not Specified";
      const rawText = item.description || item.jobDescription || item.descriptionHtml || (item as any).text || "";
      // Comprehensive URL resolution for both LinkedIn Jobs and Feed Posts
      const itemAny = item as any;
      let jobUrl =
        item.url ||
        item.jobUrl ||
        item.link ||
        itemAny.postUrl ||
        itemAny.post_url ||
        itemAny.linkedinUrl ||
        itemAny.linkedin_url ||
        itemAny.shareUrl ||
        itemAny.desktopUrl ||
        itemAny.mobileUrl ||
        itemAny.postLink ||
        itemAny.navigationUrl ||
        itemAny.actionUrl ||
        itemAny.originalUrl ||
        itemAny.canonicalUrl ||
        itemAny.webUrl ||
        "";

      if (!jobUrl || !jobUrl.startsWith("http")) {
        const urn = itemAny.urn || itemAny.activityUrn || itemAny.activity_urn || itemAny.postUrn || itemAny.post_urn;
        const activityId = itemAny.activityId || itemAny.activity_id || itemAny.postId || itemAny.post_id || itemAny.id;

        if (urn && typeof urn === "string") {
          if (urn.startsWith("http")) {
            jobUrl = urn;
          } else if (urn.startsWith("urn:li:")) {
            jobUrl = `https://www.linkedin.com/feed/update/${urn}`;
          } else {
            jobUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${urn}`;
          }
        } else if (activityId) {
          const cleanId = String(activityId).trim();
          if (cleanId.startsWith("http")) {
            jobUrl = cleanId;
          } else if (cleanId.startsWith("urn:li:")) {
            jobUrl = `https://www.linkedin.com/feed/update/${cleanId}`;
          } else if (/^\d+$/.test(cleanId)) {
            if (source === "posts") {
              jobUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${cleanId}`;
            } else {
              jobUrl = `https://www.linkedin.com/jobs/view/${cleanId}`;
            }
          }
        }

        if (!jobUrl) {
          const authorUrl = itemAny.authorUrl || itemAny.authorProfileUrl || itemAny.author_url || itemAny.author?.profileUrl || itemAny.author?.url || itemAny.postedByUrl;
          if (authorUrl && typeof authorUrl === "string" && authorUrl.startsWith("http")) {
            jobUrl = authorUrl;
          }
        }
      }

      if (!rawText || rawText.trim().length < 40) {
        console.log(`[Apify Scraper] Skipping job "${title}" at "${company}" due to empty description`);
        jobsSkipped++;
        processedJobs.push({
          title,
          company,
          score: 0,
          url: jobUrl,
          imported: false,
          reason: "Empty job description",
        });
        continue;
      }

      // ── Deduplication: check LinkedIn job ID first (fastest), then URL ──────
      const linkedinJobId = item.id ? String(item.id) : ((item as any).postId ? String((item as any).postId) : null);

      if (linkedinJobId) {
        const byId = await prisma.jobPost.findUnique({
          where: { linkedinJobId },
          select: { id: true, matchScore: true },
        });
        if (byId) {
          console.log(`[Apify] Duplicate by LinkedIn ID "${linkedinJobId}" — "${title}" skipped.`);
          jobsSkipped++;
          processedJobs.push({
            title,
            company,
            score: byId.matchScore,
            url: jobUrl,
            imported: true,
            dbId: byId.id,
            reason: "Already imported",
          });
          continue;
        }
      } else {
        // Fallback: check by URL if no LinkedIn ID
        const byUrl = jobUrl ? await prisma.jobPost.findFirst({
          where: { linkedin: jobUrl },
          select: { id: true, matchScore: true },
        }) : null;
        if (byUrl) {
          console.log(`[Apify] Duplicate by URL "${jobUrl}" — "${title}" skipped.`);
          jobsSkipped++;
          processedJobs.push({
            title,
            company,
            score: byUrl.matchScore,
            url: jobUrl,
            imported: true,
            dbId: byUrl.id,
            reason: "Already imported",
          });
          continue;
        }
      }

      console.log(`[Apify Scraper] Analyzing job post: "${title}" at "${company}"`);

      // Run existing Gemini candidacy analysis
      const analysisResult = await analyzeJobCandidacyAction(rawText, userEmail);

      if (analysisResult.success) {
        const score = analysisResult.score ?? 50;
        console.log(`[Apify Scraper] Job "${title}" match score: ${score}`);

        // Set threshold to 55 as per the existing WhatsApp sync conventions
        if (score >= 55) {
          const newJob = await addJobPostAction({
            userEmail,
            role: analysisResult.role || title,
            company: analysisResult.company || company,
            originalText: rawText,
            parsedSummary: analysisResult.explanation || rawText.slice(0, 300),
            contactEmail: analysisResult.contactEmail || undefined,
            matchScore: score,
            tags: source === "posts" ? ["LinkedInPost", "Scraped"] : ["LinkedIn", "Scraped"],
            // Extra fields passed through to db-actions via (job as any)
            ...(jobUrl        ? { linkedin:       jobUrl }        : {}),
            ...(linkedinJobId ? { linkedinJobId: linkedinJobId } : {}),
            notes: `LinkedIn job URL: ${jobUrl}${analysisResult.contactPhone ? ` | Phone: ${analysisResult.contactPhone}` : ""}`,
            suggestAttachResume: true,
          } as any);
          jobsImported++;
          processedJobs.push({
            title,
            company,
            score,
            url: jobUrl,
            imported: true,
            dbId: newJob.id,
          });
          console.log(`[Apify Scraper] Imported job: "${title}" (Score: ${score})`);
        } else {
          console.log(`[Apify Scraper] Job "${title}" skipped (Score: ${score} < 55)`);
          jobsSkipped++;
          processedJobs.push({
            title,
            company,
            score,
            url: jobUrl,
            imported: false,
            reason: `Fit score (${score}) too low`,
          });
        }
      } else {
        console.warn(`[Apify Scraper] AI analysis failed for "${title}". Skipping.`);
        jobsSkipped++;
        processedJobs.push({
          title,
          company,
          score: 0,
          url: jobUrl,
          imported: false,
          reason: "AI analysis error",
        });
      }
    }

    // ── Save sync log so next run knows we already scanned this keyword ─────
    if (keyword && userEmail) {
      try {
        await prisma.linkedInSyncLog.upsert({
          where: { userEmail_keyword_jobType: { userEmail, keyword, jobType } },
          create: {
            userEmail,
            keyword,
            jobType,
            lastSyncAt:   new Date(),
            jobsImported: jobsImported,
            totalScanned: jobsProcessed,
          },
          update: {
            lastSyncAt:   new Date(),
            jobsImported: { increment: jobsImported },
            totalScanned: { increment: jobsProcessed },
          },
        });
        console.log(`[Apify] SyncLog updated for "${keyword}" (${jobType})`);
      } catch (logErr) {
        console.warn("[Apify] Failed to update LinkedInSyncLog:", logErr);
      }
    }

    return {
      success: true,
      message: `Completed sync. Processed: ${jobsProcessed}, Imported: ${jobsImported}, Skipped: ${jobsSkipped}`,
      jobsProcessed,
      jobsImported,
      jobsSkipped,
      processedJobs,
    };

  } catch (error: any) {
    console.error("[Apify Scraper] Error processing dataset:", error);
    return {
      success: false,
      message: error.message || "Failed to process scraped jobs",
      error: error.message,
    };
  }
}
