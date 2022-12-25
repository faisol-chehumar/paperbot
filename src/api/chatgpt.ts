import { ChatGPTAPIBrowser } from 'chatgpt'
import { Collection } from 'discord.js'

if (!process.env.OPENAI_EMAIL || !process.env.OPENAI_PASSWORD) {
  throw new Error('OPENAI_EMAIL and OPENAI_PASSWORD are required')
}

const chatgptAPI = new ChatGPTAPIBrowser({
  email: process.env.OPENAI_EMAIL,
  isGoogleLogin: true,
  password: process.env.OPENAI_PASSWORD,
})

let hasSession = false

chatgptAPI.initSession().then(() => console.log('ChatGPT session initialized'))
const conversations = new Collection<string, string>()

export async function getChatGPTResponse(memberId: string, prompt: string) {
  if (!hasSession) {
    await chatgptAPI.initSession()
    hasSession = true
  }

  let conversationId = conversations.get(memberId)

  const response = await chatgptAPI.sendMessage(prompt, {
    conversationId: conversationId,
    timeoutMs: 2 * 60 * 1000,
  })

  if (!conversationId) {
    conversations.set(memberId, response.conversationId)
  }

  return response
}
