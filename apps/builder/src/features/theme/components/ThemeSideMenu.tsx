import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { ChatIcon, CodeIcon, DropletIcon, TableIcon } from '@/components/icons'
import { ChatTheme, GeneralTheme, ThemeTemplate } from '@typebot.io/schemas'
import React from 'react'
import { CustomCssSettings } from './CustomCssSettings'
import { useTypebot } from '@/features/editor/providers/TypebotProvider'
import { headerHeight } from '@/features/editor/constants'
import { ChatThemeSettings } from './chat/ChatThemeSettings'
import { GeneralSettings } from './general/GeneralSettings'
import { ThemeTemplates } from './ThemeTemplates'
import { useTranslate } from '@tolgee/react'

export const ThemeSideMenu = () => {
  const { t } = useTranslate()

  const { typebot, updateTypebot, currentUserMode } = useTypebot()

  const updateChatTheme = (chat: ChatTheme) =>
    typebot && updateTypebot({ updates: { theme: { ...typebot.theme, chat } } })

  const updateGeneralTheme = (general?: GeneralTheme) =>
    typebot &&
    updateTypebot({ updates: { theme: { ...typebot.theme, general } } })

  const updateCustomCss = (customCss: string) =>
    typebot &&
    updateTypebot({ updates: { theme: { ...typebot.theme, customCss } } })

  const selectedTemplate = (
    selectedTemplate: Partial<Pick<ThemeTemplate, 'id' | 'theme'>>
  ) => {
    if (!typebot) return
    const { theme, id } = selectedTemplate
    updateTypebot({
      updates: {
        selectedThemeTemplateId: id,
        theme: theme ? { ...theme } : typebot.theme,
      },
    })
  }

  return (
    <Stack
      flex="1"
      maxW="400px"
      height={`calc(100vh - ${headerHeight}px)`}
      borderRightWidth={1}
      pt={10}
      spacing={10}
      overflowY="scroll"
      pb="20"
      position="relative"
    >
      <Heading fontSize="xl" textAlign="center">
        {t('theme.sideMenu.title')}
      </Heading>
      <Accordion allowMultiple>
        {currentUserMode === 'write' && (
          <AccordionItem>
            <AccordionButton py={6}>
              <HStack flex="1" pl={2}>
                <TableIcon />
                <Heading fontSize="lg">{t('theme.sideMenu.template')}</Heading>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={12}>
              {typebot && (
                <ThemeTemplates
                  selectedTemplateId={
                    typebot.selectedThemeTemplateId ?? undefined
                  }
                  currentTheme={typebot.theme}
                  workspaceId={typebot.workspaceId}
                  onTemplateSelect={selectedTemplate}
                />
              )}
            </AccordionPanel>
          </AccordionItem>
        )}
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <DropletIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.global')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {typebot && (
              <GeneralSettings
                generalTheme={typebot.theme.general}
                onGeneralThemeChange={updateGeneralTheme}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <ChatIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.chat')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {typebot && (
              <ChatThemeSettings
                workspaceId={typebot.workspaceId}
                typebotId={typebot.id}
                chatTheme={typebot.theme.chat}
                onChatThemeChange={updateChatTheme}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton py={6}>
            <HStack flex="1" pl={2}>
              <CodeIcon />
              <Heading fontSize="lg">{t('theme.sideMenu.customCSS')}</Heading>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            {typebot && (
              <CustomCssSettings
                customCss={typebot.theme.customCss}
                onCustomCssChange={updateCustomCss}
              />
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Stack>
  )
}
