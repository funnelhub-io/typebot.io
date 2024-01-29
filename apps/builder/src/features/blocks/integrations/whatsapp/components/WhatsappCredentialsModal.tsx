import { useTypebot } from '@/features/editor/providers/TypebotProvider'
import { useWorkspace } from '@/features/workspace/WorkspaceProvider'
import { useToast } from '@/hooks/useToast'
import { trpc } from '@/lib/trpc'
import {
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { createId } from '@paralleldrive/cuid2'
import { useTranslate } from '@tolgee/react'
import { env } from '@typebot.io/env'
import { useQRCode } from 'next-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
type Props = {
  isOpen: boolean
  onClose: () => void
  onNewCredentials: (id: string) => void
}

export const WhatsappCredentialsModal = ({
  isOpen,
  onClose,
  onNewCredentials,
}: Props) => {
  const { t } = useTranslate()

  const stepMessages = {
    loadingQrCode: t(
      'editor.blocks.integrations.whatsapp.WhatsappCredetialsModal.loadingQrCode'
    ),
    loadingAuthentication: t(
      'editor.blocks.integrations.whatsapp.WhatsappCredetialsModal.processingAuthentication'
    ),
  }

  const { workspace } = useWorkspace()
  const { typebot } = useTypebot()
  const { SVG } = useQRCode()
  const { showToast } = useToast()
  const [whatsappQrCode, setWhatsappQrCode] = useState<string | null>(null)
  const [processAuthWppLoading, setProcessAuthWppLoading] = useState(true)
  const socketRef = useRef<WebSocket | null>(null)
  const [stepLoadingMessage, setStepLoadingMessage] = useState<string | null>(
    stepMessages.loadingQrCode
  )

  const {
    credentials: {
      listCredentials: { refetch: refetchCredentials },
    },
  } = trpc.useContext()

  const { mutate } = trpc.credentials.createCredentials.useMutation({
    onError: (err: { message: string }) => {
      showToast({
        description: err.message,
        status: 'error',
      })
    },
    onSuccess: (data) => {
      refetchCredentials()
      onNewCredentials(data.credentialsId)
      onClose()
    },
  })

  const handleStartWebsocket = useCallback(async () => {
    if (!workspace || !typebot) return

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    const now = new Date().getTime()
    const socket = new WebSocket(
      `${env.NEXT_PUBLIC_WHATSAPP_SERVER}?clientId=${workspace.id}_${now}`
    )
    socket.onmessage = function (event) {
      if (!event.data) return
      if (event.data) {
        const payloadParsed = JSON.parse(event.data ?? '{}')

        switch (payloadParsed.status) {
          case 'qr':
            if (stepLoadingMessage === stepMessages.loadingAuthentication)
              return
            setWhatsappQrCode(payloadParsed.qr)
            setProcessAuthWppLoading(false)
            break
          case 'loading':
            setProcessAuthWppLoading(true)
            setStepLoadingMessage(stepMessages.loadingAuthentication)
            break
          case 'ready':
            mutate({
              credentials: {
                id: createId(),
                type: 'whatsAppSocket',
                workspaceId: workspace.id,
                name: `whatsApp-${payloadParsed.phoneNumber}`,
                data: {
                  clientId: `${workspace.id}_${now}`,
                  phoneNumber: payloadParsed.phoneNumber as string,
                },
              },
            })
            setStepLoadingMessage(stepMessages.loadingQrCode)
            setProcessAuthWppLoading(true)
            setWhatsappQrCode(null)
        }
      }
    }

    socketRef.current = socket
  }, [mutate, typebot, workspace])

  const handleEndWebSocket = useCallback(() => {
    socketRef.current?.close()
    onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) handleStartWebsocket()
    else handleEndWebSocket()
  }, [isOpen, handleStartWebsocket, handleEndWebSocket])

  return (
    <Modal isOpen={isOpen} onClose={handleEndWebSocket} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {t(
            'editor.blocks.integrations.whatsapp.WhatsappCredentialsModal.ModalHeader'
          )}
        </ModalHeader>
        <ModalCloseButton />
        <Flex alignItems="center" justifyContent="center" padding={5}>
          {!!whatsappQrCode &&
            !processAuthWppLoading &&
            !(stepLoadingMessage === stepMessages.loadingAuthentication) && (
              <SVG
                text={whatsappQrCode}
                options={{
                  type: 'image/jpeg',
                  quality: 0.3,
                  errorCorrectionLevel: 'M',
                  margin: 3,
                  scale: 5,
                  width: 200,
                }}
              />
            )}
          {processAuthWppLoading && (
            <Flex alignItems={'center'} direction="column" gap={8}>
              <Spinner size={'xl'} />
              <Text>{stepLoadingMessage}</Text>
            </Flex>
          )}
        </Flex>
      </ModalContent>
    </Modal>
  )
}