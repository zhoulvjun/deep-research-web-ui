import { deepResearch, ResearchStep } from "~/lib/deep-research";

export default defineEventHandler(async event => {
  const { initialQuery, feedback, depth, breadth } =
    await readBody(event)
  console.log({ initialQuery, feedback, depth, breadth })

  // 设置 SSE 响应头
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const combinedQuery = `
Initial Query: ${initialQuery}
Follow-up Questions and Answers:
${feedback.map((qa: { question: string; answer: string }) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n')}
`

  return new Promise<void>(async (resolve, reject) => {
    const onProgress = (data: ResearchStep) => {
      console.log(data)
      // 发送进度事件
      event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
    await deepResearch({
      query: combinedQuery,
      breadth,
      depth,
      onProgress,
    })
    resolve()
  })
})