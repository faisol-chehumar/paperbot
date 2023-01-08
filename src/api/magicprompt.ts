import { post } from '../utils/get.js'

interface MagicPromptResponse {
  data: string[]
  duration: number
}

export async function improvePromptWithMagic(prompt: string) {
  try {
    const response = await post<MagicPromptResponse>(
      'http://127.0.0.1:7861/run/predict',
      {
        body: JSON.stringify({ data: [prompt] }),
      }
    )

    return response.data[0]
  } catch (error) {
    console.log('Something went wrong generating a prompt with magic', error)
    return prompt
  }
}
