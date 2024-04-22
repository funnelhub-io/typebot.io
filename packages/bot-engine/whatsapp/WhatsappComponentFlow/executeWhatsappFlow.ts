import * as Sentry from '@sentry/nextjs'
import { TRPCError } from '@trpc/server'
import { isNotDefined } from '@typebot.io/lib/utils'
import {
  ContinueChatResponse,
  SessionState,
  Settings,
} from '@typebot.io/schemas'
import { HTTPError } from 'ky'
import { computeTypingDuration } from '../../computeTypingDuration'
import { continueBotFlow } from '../../continueBotFlow'
import { convertInputToWhatsAppComponent } from './convertInputToWhatsappComponent'
import {
  TypeWhatsappMessage,
  WhatsappSocketSendingMessage,
  convertMessageToWhatsappComponent,
} from './convertMessageToWhatsappComponent'
import { sendSocketWhatsappMessage } from './sendWhatsappSocketMessage'

type Props = {
  state: SessionState
} & Pick<ContinueChatResponse, 'messages' | 'input' | 'clientSideActions'>

const messageAfterMediaTimeout = 5000

export async function executeWhatsappFlow({
  state,
  messages,
  input,
  clientSideActions,
}: Props) {
  if (!state?.whatsappComponent?.clientId)
    throw new Error('Whatsapp component not configured')

  if (!state?.whatsappComponent?.phone)
    throw new Error('Whatsapp component phone not configured')

  const messagesBeforeInput = messages

  const sentMessages: WhatsappSocketSendingMessage[] = []

  const clientSideActionsBeforeMessages =
    clientSideActions?.filter((action) =>
      isNotDefined(action.lastBubbleBlockId)
    ) ?? []

  for (const action of clientSideActionsBeforeMessages) {
    const result = await executeClientSideAction(action)
    if (!result) continue
    const { input, newSessionState, messages, clientSideActions } =
      await continueBotFlow(result.replyToSend, { version: 2, state })

    return executeWhatsappFlow({
      messages,
      input,
      clientSideActions,
      state: newSessionState,
    })
  }

  for (const message of messagesBeforeInput) {
    const whatsAppMessage = convertMessageToWhatsappComponent(message)
    if (isNotDefined(whatsAppMessage)) continue
    try {
      await sendSocketWhatsappMessage(state.whatsappComponent?.clientId, {
        message: whatsAppMessage,
        phones: [state.whatsappComponent.phone],
        sessionId: state.sessionId as unknown as string,
        state,
      })
      sentMessages.push(whatsAppMessage)
      const clientSideActionsAfterMessage =
        clientSideActions?.filter(
          (action) => action.lastBubbleBlockId === message.id
        ) ?? []
      for (const action of clientSideActionsAfterMessage) {
        const result = await executeClientSideAction(action)
        if (!result) continue
        const { input, newSessionState, messages, clientSideActions } =
          await continueBotFlow(result.replyToSend, { version: 2, state })

        return executeWhatsappFlow({
          messages,
          input,
          clientSideActions,
          state: newSessionState,
        })
      }
    } catch (err) {
      console.log(err)
      Sentry.captureException(err, { extra: { message } })
      console.log('Failed to send message:', JSON.stringify(message, null, 2))
      if (err instanceof HTTPError)
        console.log('HTTPError', err.response.status, err.response.body)
      if (err instanceof TRPCError) throw err
    }
  }

  if (input) {
    const inputWhatsAppMessages = convertInputToWhatsAppComponent(input)
    for (const message of inputWhatsAppMessages) {
      try {
        if (isNotDefined(message)) continue
        const lastSentMessageIsMedia = ['audio', 'video', 'image'].includes(
          sentMessages.at(-1)?.type ?? ''
        )
        const typingDuration = lastSentMessageIsMedia
          ? messageAfterMediaTimeout
          : getTypingDuration({
              message,
              typingEmulation: state.typingEmulation,
            })
        if (typingDuration)
          await new Promise((resolve) => setTimeout(resolve, typingDuration))
        await sendSocketWhatsappMessage(state.whatsappComponent?.clientId, {
          message,
          phones: [state.whatsappComponent.phone],
          sessionId: state.sessionId as unknown as string,
          state,
        })
      } catch (err) {
        console.log(err)
        Sentry.captureException(err, { extra: { message } })
        console.log('Failed to send message:', JSON.stringify(message, null, 2))
        if (err instanceof HTTPError)
          console.log('HTTPError', err.response.status, err.response.body)
      }
    }
  }
}

const executeClientSideAction = async (
  clientSideAction: NonNullable<
    ContinueChatResponse['clientSideActions']
  >[number]
): Promise<{ replyToSend: string | undefined } | void> => {
  if ('wait' in clientSideAction) {
    await new Promise((resolve) =>
      setTimeout(resolve, clientSideAction.wait.secondsToWaitFor * 1000)
    )
    if (!clientSideAction.expectsDedicatedReply) return
    return {
      replyToSend: undefined,
    }
  }
}

const getTypingDuration = ({
  message,
  typingEmulation,
}: {
  message: WhatsappSocketSendingMessage
  typingEmulation?: Settings['typingEmulation']
}): number | undefined => {
  switch (message.type) {
    case TypeWhatsappMessage.TEXT:
      return computeTypingDuration({
        bubbleContent: message.body,
        typingSettings: typingEmulation,
      })
    case TypeWhatsappMessage.INTERACTIVE:
      if (!message.interactive?.text) return
      return computeTypingDuration({
        bubbleContent: message.interactive.body?.text ?? '',
        typingSettings: typingEmulation,
      })
    case 'audio':
    case 'video':
    case 'image':
      return
  }
}
