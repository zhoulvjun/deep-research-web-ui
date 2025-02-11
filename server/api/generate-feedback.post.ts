// This file is currently unused
import { generateFeedback } from '~/lib/feedback'

export default defineEventHandler(async (event) => {
  const { query, numQuestions } = await readBody(event)
  console.log({ query, numQuestions })
  const feedback = generateFeedback({
    query,
    numQuestions,
  })

  return feedback.toDataStreamResponse({
    sendUsage: true,
    getErrorMessage(error) {
      console.error('Error generating feedback:', error)
      return 'Error generating feedback'
    },
  })
})
