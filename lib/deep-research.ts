import { generateObject, streamText } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';
import { parseStreamingJson, type DeepPartial } from '~/utils/json';

import { o3MiniModel, trimPrompt } from './ai/providers';
import { systemPrompt } from './prompt';
import zodToJsonSchema from 'zod-to-json-schema';
import { tavily, type TavilySearchResponse } from '@tavily/core';

// Used for streaming response
export type SearchQuery = z.infer<typeof searchQueriesTypeSchema>['queries'][0];
export type PartialSearchQuery = DeepPartial<SearchQuery>;
export type SearchResult = z.infer<typeof searchResultTypeSchema>;
export type PartialSearchResult = DeepPartial<SearchResult>;

export type ResearchStep =
  | { type: 'generating_query'; result: PartialSearchQuery; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'generated_query'; query: string; result: PartialSearchQuery; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'searching'; query: string; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'search_complete'; query: string; urls: string[]; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'processing_serach_result'; query: string; result: PartialSearchResult; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'processed_search_result'; query: string; result: SearchResult; depth: number; breadth: number; nodeIndex: number; nodeId: string }
  | { type: 'error'; message: string; depth: number; nodeId: string }
  | { type: 'complete' };

// increase this if you have higher API rate limits
const ConcurrencyLimit = 2;

// Initialize Firecrawl with optional API key and optional base url

// const firecrawl = new FirecrawlApp({
//   apiKey: process.env.FIRECRAWL_KEY ?? '',
//   apiUrl: process.env.FIRECRAWL_BASE_URL,
// });
const tvly = tavily({
  apiKey: import.meta.env.VITE_TAVILY_API_KEY ?? '',
})

/**
 * Schema for {@link generateSearchQueries} without dynamic descriptions
 */
export const searchQueriesTypeSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      researchGoal: z.string(),
    }),
  ),
});

// take en user query, return a list of SERP queries
export function generateSearchQueries({
  query,
  numQueries = 3,
  learnings,
}: {
  query: string;
  numQueries?: number;
  // optional, if provided, the research will continue from the last learning
  learnings?: string[];
}) {
  const schema = z.object({
    queries: z
      .array(
        z.object({
          query: z.string().describe('The SERP query'),
          researchGoal: z
            .string()
            .describe(
              'First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions.',
            ),
        }),
      )
      .describe(`List of SERP queries, max of ${numQueries}`)
  })
  const jsonSchema = JSON.stringify(zodToJsonSchema(schema));

  const prompt = [
    `Given the following prompt from the user, generate a list of SERP queries to research the topic. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n`,
    learnings
      ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
        '\n',
      )}`
      : '',
    `You MUST respond in JSON with the following schema: ${jsonSchema}`,
  ].join('\n\n');
  return streamText({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt,
  });
}

export const searchResultTypeSchema = z.object({
  learnings: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});
function processSearchResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 3,
}: {
  query: string;
  // result: SearchResponse;
  result: TavilySearchResponse
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const schema = z.object({
    learnings: z
      .array(z.string())
      .describe(`List of learnings, max of ${numLearnings}`),
    followUpQuestions: z
      .array(z.string())
      .describe(
        `List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`,
      ),
  });
  const jsonSchema = JSON.stringify(zodToJsonSchema(schema));
  const contents = compact(result.results.map(item => item.content)).map(
    content => trimPrompt(content, 25_000),
  );
  const prompt = [
    `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.`,
    `<contents>${contents
      .map(content => `<content>\n${content}\n</content>`)
      .join('\n')}</contents>`,
    `You MUST respond in JSON with the following schema: ${jsonSchema}`,
  ].join('\n\n');

  return streamText({
    model: o3MiniModel,
    abortSignal: AbortSignal.timeout(60_000),
    system: systemPrompt(),
    prompt,
  });
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}) {
  const learningsString = trimPrompt(
    learnings
      .map(learning => `<learning>\n${learning}\n</learning>`)
      .join('\n'),
    150_000,
  );

  const res = await generateObject({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, write a final report on the topic using the learnings from research. Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    schema: z.object({
      reportMarkdown: z
        .string()
        .describe('Final report on the topic in Markdown'),
    }),
  });

  // Append the visited URLs section to the report
  const urlsSection = `\n\n## Sources\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
  return res.object.reportMarkdown + urlsSection;
}

function childNodeId(parentNodeId: string, currentIndex: number) {
  return `${parentNodeId}-${currentIndex}`;
}

export async function deepResearch({
  query,
  breadth,
  maxDepth,
  learnings = [],
  visitedUrls = [],
  onProgress,
  currentDepth = 1,
  nodeId = '0'
}: {
  query: string;
  breadth: number;
  maxDepth: number;
  learnings?: string[];
  visitedUrls?: string[];
  onProgress: (step: ResearchStep) => void;
  currentDepth?: number;
  nodeId?: string
}): Promise<void> {
  try {
    const searchQueriesResult = generateSearchQueries({
      query,
      learnings,
      numQueries: breadth,
    });
    const limit = pLimit(ConcurrencyLimit);

    let searchQueries: PartialSearchQuery[] = [];

    for await (const parsedQueries of parseStreamingJson(
      searchQueriesResult.textStream,
      searchQueriesTypeSchema,
      (value) => !!value.queries?.length && !!value.queries[0]?.query
    )) {
      if (parsedQueries.queries) {
        for (let i = 0; i < searchQueries.length; i++) {
          onProgress({
            type: 'generating_query',
            result: searchQueries[i],
            depth: currentDepth,
            breadth,
            nodeIndex: i,
            nodeId: childNodeId(nodeId, i)
          });
        }
        searchQueries = parsedQueries.queries;
      }
    }

    for (let i = 0; i < searchQueries.length; i++) {
      onProgress({
        type: 'generated_query',
        query,
        result: searchQueries[i],
        depth: currentDepth,
        breadth,
        nodeIndex: i,
        nodeId: childNodeId(nodeId, i)
      });
    }

    await Promise.all(
      searchQueries.map((searchQuery, nodeIndex) =>
        limit(async () => {
          if (!searchQuery?.query) return
          onProgress({
            type: 'searching',
            query: searchQuery.query,
            depth: currentDepth,
            breadth,
            nodeIndex,
            nodeId: childNodeId(nodeId, nodeIndex)
          })
          try {
            // const result = await firecrawl.search(searchQuery.query, {
            //   timeout: 15000,
            //   limit: 5,
            //   scrapeOptions: { formats: ['markdown'] },
            // });
            const result = await tvly.search(searchQuery.query, {
              maxResults: 5,
            })
            console.log(`Ran ${searchQuery.query}, found ${result.results.length} contents`);

            // Collect URLs from this search
            const newUrls = compact(result.results.map(item => item.url));
            // Breadth for the next search is half of the current breadth
            const nextBreadth = Math.ceil(breadth / 2);

            const searchResultGenerator = processSearchResult({
              query: searchQuery.query,
              result,
              numFollowUpQuestions: nextBreadth,
            });
            let searchResult: PartialSearchResult = {};

            for await (const parsedLearnings of parseStreamingJson(
              searchResultGenerator.textStream,
              searchResultTypeSchema,
              (value) => !!value.learnings?.length
            )) {
              searchResult = parsedLearnings;
              onProgress({
                type: 'processing_serach_result',
                result: parsedLearnings,
                depth: currentDepth,
                breadth: breadth,
                query: searchQuery.query,
                nodeIndex: nodeIndex,
                nodeId: childNodeId(nodeId, nodeIndex)
              });
            }
            console.log(`Processed search result for ${searchQuery.query}`, searchResult);
            const allLearnings = [...learnings, ...(searchResult.learnings ?? [])];
            const allUrls = [...visitedUrls, ...newUrls];
            const nextDepth = currentDepth + 1;

            onProgress({
              type: 'processed_search_result',
              result: {
                learnings: allLearnings,
                followUpQuestions: searchResult.followUpQuestions ?? [],
              },
              depth: currentDepth,
              breadth,
              query: searchQuery.query,
              nodeIndex: nodeIndex,
              nodeId: childNodeId(nodeId, nodeIndex)
            })

            if (nextDepth < maxDepth && searchResult.followUpQuestions?.length) {
              console.warn(
                `Researching deeper, breadth: ${nextBreadth}, depth: ${nextDepth}`,
              );

              const nextQuery = `
              Previous research goal: ${searchQuery.researchGoal}
              Follow-up research directions: ${searchResult.followUpQuestions.map(q => `\n${q}`).join('')}
            `.trim();

              return deepResearch({
                query: nextQuery,
                breadth: nextBreadth,
                maxDepth,
                learnings: allLearnings,
                visitedUrls: allUrls,
                onProgress,
                currentDepth: nextDepth,
                nodeId: childNodeId(nodeId, nodeIndex),
              });
            } else {
              return {
                learnings: allLearnings,
                visitedUrls: allUrls,
              };
            }
          } catch (e: any) {
            throw new Error(`Error searching for ${searchQuery.query}, depth ${currentDepth}\nMessage: ${e.message}`)
          }
        }),
      ),
    );
  } catch (error: any) {
    console.error(error);
    onProgress({
      type: 'error',
      message: error?.message ?? 'Something went wrong',
      depth: currentDepth,
      nodeId,
    })
  }

  onProgress({
    type: 'complete',
  });
}