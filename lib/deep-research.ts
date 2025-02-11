import { generateObject, streamText } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';
import { parseStreamingJson, type DeepPartial } from '~/utils/json';

import { o3MiniModel, trimPrompt } from './ai/providers';
import { systemPrompt } from './prompt';
import zodToJsonSchema from 'zod-to-json-schema';
import { tavily, type TavilySearchResponse } from '@tavily/core';
// import 'dotenv/config';

// Used for streaming response
type PartialSerpQueries = DeepPartial<z.infer<typeof serpQueriesTypeSchema>['queries']>;
type PartialSearchResult = DeepPartial<z.infer<typeof serpResultTypeSchema>>;

export type ResearchStep =
  | { type: 'start'; message: string; depth: number; breadth: number }
  | { type: 'generating_queries'; result: PartialSerpQueries; depth: number; breadth: number }
  | { type: 'query_generated'; query: string; researchGoal: string; depth: number; breadth: number; queryIndex: number }
  | { type: 'searching'; query: string; depth: number; breadth: number; queryIndex: number }
  | { type: 'search_complete'; query: string; urls: string[]; depth: number; breadth: number; queryIndex: number }
  | { type: 'processing_serach_result'; query: string; result: PartialSearchResult; depth: number; breadth: number; queryIndex: number }
  | { type: 'error'; message: string }
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
 * Schema for {@link generateSerpQueries} without dynamic descriptions
 */
export const serpQueriesTypeSchema = z.object({
  queries: z.array(
    z.object({
      query: z.string(),
      researchGoal: z.string(),
    }),
  ),
});

// take en user query, return a list of SERP queries
export function generateSerpQueries({
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

export const serpResultTypeSchema = z.object({
  learnings: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});
function processSerpResult({
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

export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
  onProgress,
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  onProgress: (step: ResearchStep) => void;
}): Promise<void> {
  onProgress({ type: 'start', message: `开始深度研究，深度：${depth}，广度：${breadth}`, depth, breadth });

  try {
    const serpQueriesResult = generateSerpQueries({
      query,
      learnings,
      numQueries: breadth,
    });
    const limit = pLimit(ConcurrencyLimit);

    let serpQueries: PartialSerpQueries = [];

    for await (const parsedQueries of parseStreamingJson(
      serpQueriesResult.textStream,
      serpQueriesTypeSchema,
      (value) => !!value.queries?.length && !!value.queries[0]?.query
    )) {
      if (parsedQueries.queries) {
        serpQueries = parsedQueries.queries;
        onProgress({
          type: 'generating_queries',
          result: serpQueries,
          depth,
          breadth
        });
      }
    }

    await Promise.all(
      serpQueries.map(serpQuery =>
        limit(async () => {
          if (!serpQuery?.query) return
          try {
            // const result = await firecrawl.search(serpQuery.query, {
            //   timeout: 15000,
            //   limit: 5,
            //   scrapeOptions: { formats: ['markdown'] },
            // });
            const result = await tvly.search(serpQuery.query, {
              maxResults: 5,
            })
            console.log(`Ran ${serpQuery.query}, found ${result.results.length} contents`);

            // Collect URLs from this search
            const newUrls = compact(result.results.map(item => item.url));
            const newBreadth = Math.ceil(breadth / 2);
            const newDepth = depth - 1;

            const serpResultGenerator = processSerpResult({
              query: serpQuery.query,
              result,
              numFollowUpQuestions: newBreadth,
            });
            let serpResult: PartialSearchResult = {};

            for await (const parsedLearnings of parseStreamingJson(
              serpResultGenerator.textStream,
              serpResultTypeSchema,
              (value) => !!value.learnings?.length
            )) {
              serpResult = parsedLearnings;
              onProgress({
                type: 'processing_serach_result',
                result: parsedLearnings,
                depth,
                breadth,
                query: serpQuery.query,
                queryIndex: serpQueries.indexOf(serpQuery),
              });
            }
            console.log(`Processed serp result for ${serpQuery.query}`, serpResult);
            const allLearnings = [...learnings, ...(serpResult.learnings ?? [])];
            const allUrls = [...visitedUrls, ...newUrls];

            if (newDepth > 0 && serpResult.followUpQuestions?.length) {
              console.log(
                `Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`,
              );

              const nextQuery = `
              Previous research goal: ${serpQuery.researchGoal}
              Follow-up research directions: ${serpResult.followUpQuestions.map(q => `\n${q}`).join('')}
            `.trim();

              return deepResearch({
                query: nextQuery,
                breadth: newBreadth,
                depth: newDepth,
                learnings: allLearnings,
                visitedUrls: allUrls,
                onProgress,
              });
            } else {
              return {
                learnings: allLearnings,
                visitedUrls: allUrls,
              };
            }
          } catch (e: any) {
            throw new Error(`Error searching for ${serpQuery.query}, depth ${depth}\nMessage: ${e.message}`)
          }
        }),
      ),
    );
  } catch (error: any) {
    console.error(error);
    onProgress({
      type: 'error',
      message: error?.message ?? 'Something went wrong',
    })
  }

  onProgress({
    type: 'complete',
  });
}