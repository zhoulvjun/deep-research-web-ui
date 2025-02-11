import { generateFeedback } from './lib/feedback'

async function test() {
  console.log('test')
  const feedback = generateFeedback({
    query: 'Why is the sky blue?',
  })
  console.log('feedback', feedback)

  for await (const partial of feedback.textStream) {
    console.log(partial)
  }
  console.log('end', feedback)
}

test()
