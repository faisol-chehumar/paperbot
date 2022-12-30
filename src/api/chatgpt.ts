import { ChatResponse } from 'chatgpt'

import authJson from '../../auth.json' assert { type: 'json' }
import { post } from '../utils/get.js'

if (!authJson.clearanceToken || !authJson.sessionToken) {
  throw new Error(
    'clearance Token and sessionToken are required, run the chatgpt script to retrieve them'
  )
}

export async function getChatGPTResponse(
  guildId: string | null,
  memberId: string | null,
  prompt: string,
  newConversation: boolean
): Promise<ChatResponse> {
  console.log('Sending request to chatgpt:', prompt)
  try {
    return await post<ChatResponse>('http://localhost:3000/chatgpt', {
      body: JSON.stringify({
        guildId,
        memberId,
        newConversation,
        prompt,
      }),
    })
  } catch (error) {
    console.error(error)
    throw error
  }
}
// export async function getChatGPTResponse(
//   memberId: string,
//   prompt: string
// ): Promise<ChatResponse> {
//   let conversationId = conversations.get(memberId)
//
//   const response = await chatgptAPI.sendMessage(prompt, {
//     // conversationId: conversationId,
//     timeoutMs: 2 * 60 * 1000,
//   })
//
//   if (!conversationId) {
//     conversations.set(memberId, response.conversationId)
//   }
//
//   return response
// }
