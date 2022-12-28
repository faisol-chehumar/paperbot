import { ChatGPTAPIBrowser, SendMessageOptions } from 'chatgpt'
import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'

if (!process.env.OPENAI_EMAIL || !process.env.OPENAI_PASSWORD) {
  throw new Error('OPENAI_EMAIL and OPENAI_PASSWORD are required')
}

// @ts-ignore
const fastify = Fastify({
  logger: true,
})

const prisma = new PrismaClient()

const chatgptAPI = new ChatGPTAPIBrowser({
  // debug: true,
  email: process.env.OPENAI_EMAIL,
  password: process.env.OPENAI_PASSWORD,
})

chatgptAPI.initSession().then((session) => {
  console.log('ChatGPT session initialized')
  // console.log(chatgptAPI)
  // Currently patching chatgpt index.js to spit out authInfo as such:
  // fs.writeFile('auth.json', JSON.stringify(authInfo), function (err) {
  //   if (err) throw err;
  //   console.log('Saved!');
  // })
})

const initialPrompt =
  'Hi, we are a group of people and we will address you individually as we talk. We will let you know who is talking by prepending our prompt with our name and a semicolon.'

/**
 * Server stuff
 */
fastify.post(
  '/chatgpt',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { guildId, memberId, newConversation, prompt } = request.body as {
      guildId: string
      memberId: string | undefined
      newConversation: boolean | undefined
      prompt: string
    }
    if (!guildId || !prompt) {
      reply.status(400).send('guildId and prompt are required')
      return
    }

    console.log(
      `Received request:\nGuild: ${guildId}\nMember: ${memberId}\nPrompt${
        newConversation ? ' (new conversation)' : ''
      }: ${prompt}\n`,
      guildId,
      memberId,
      prompt,
      newConversation
    )

    if (newConversation) {
      const response = await chatgptAPI.sendMessage(initialPrompt, {
        timeoutMs: 2 * 60 * 1000,
      })
      await prisma.conversation.upsert({
        create: {
          guildId,
          id: response.conversationId,
          parentMessageId: response.messageId,
        },
        update: {
          guildId,
          id: response.conversationId,
          parentMessageId: response.messageId,
        },
        where: {
          id: response.conversationId,
        },
      })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        guildId,
        // memberId,
      },
    })

    const options: SendMessageOptions = {
      timeoutMs: 2 * 60 * 1000,
    }

    if (!newConversation && conversation) {
      console.log('Found previous conversation', conversation)
      options.conversationId = conversation.id
      options.parentMessageId = conversation.parentMessageId
    }

    try {
      const response = await chatgptAPI.sendMessage(prompt, options)
      console.log('ChatGPT Response\n', response)

      if (newConversation || !conversation) {
        await prisma.conversation.upsert({
          create: {
            guildId,
            id: response.conversationId,
            parentMessageId: response.messageId,
          },
          update: {
            guildId,
            id: response.conversationId,
            parentMessageId: response.messageId,
          },
          where: {
            id: response.conversationId,
          },
        })
      }

      reply.send(response)
    } catch (error) {
      console.error(error)
    }
  }
)

try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
  prisma.$disconnect()
}
