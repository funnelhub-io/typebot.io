import {
  Flex,
  HStack,
  Button,
  IconButton,
  Tooltip,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import {
  BuoyIcon,
  ChevronLeftIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { isDefined, isNotDefined } from '@typebot.io/lib'
import { EditableTypebotName } from './EditableTypebotName'
import Link from 'next/link'
import { EditableEmojiOrImageIcon } from '@/components/EditableEmojiOrImageIcon'
import { useUndoShortcut } from '@/hooks/useUndoShortcut'
import { useDebouncedCallback } from 'use-debounce'
import { CollaborationMenuButton } from '@/features/collaboration/components/CollaborationMenuButton'
import { PublishButton } from '@/features/publish/components/PublishButton'
import { headerHeight } from '../constants'
import { RightPanel, useEditor } from '../providers/EditorProvider'
import { useTypebot } from '../providers/TypebotProvider'
import { SupportBubble } from '@/components/SupportBubble'
import { isCloudProdInstance } from '@/helpers/isCloudProdInstance'
import { useTranslate } from '@tolgee/react'

export const TypebotHeader = () => {
  const { t } = useTranslate()
  const router = useRouter()
  const {
    typebot,
    publishedTypebot,
    updateTypebot,
    save,
    undo,
    redo,
    canUndo,
    canRedo,
    isSavingLoading,
  } = useTypebot()
  const { setRightPanel, rightPanel, setStartPreviewAtGroup } = useEditor()
  const [isUndoShortcutTooltipOpen, setUndoShortcutTooltipOpen] =
    useState(false)
  const hideUndoShortcutTooltipLater = useDebouncedCallback(() => {
    setUndoShortcutTooltipOpen(false)
  }, 1000)
  const { isOpen, onOpen } = useDisclosure()

  const handleNameSubmit = (name: string) =>
    updateTypebot({ updates: { name } })

  const handleChangeIcon = (icon: string) =>
    updateTypebot({ updates: { icon } })

  const handlePreviewClick = async () => {
    setStartPreviewAtGroup(undefined)
    save().then()
    setRightPanel(RightPanel.PREVIEW)
  }

  useUndoShortcut(() => {
    if (!canUndo) return
    hideUndoShortcutTooltipLater.flush()
    setUndoShortcutTooltipOpen(true)
    hideUndoShortcutTooltipLater()
    undo()
  })

  const handleHelpClick = () => {
    isCloudProdInstance()
      ? onOpen()
      : window.open('https://docs.typebot.io', '_blank')
  }

  return (
    <Flex
      w="full"
      borderBottomWidth="1px"
      justify="center"
      align="center"
      h={`${headerHeight}px`}
      zIndex={100}
      pos="relative"
      bgColor={useColorModeValue('white', 'gray.900')}
      flexShrink={0}
    >
      {isOpen && <SupportBubble autoShowDelay={0} />}
      <HStack
        display={['none', 'flex']}
        pos={{ base: 'absolute', xl: 'static' }}
        right={{ base: 280, xl: 0 }}
      >
        <Button
          as={Link}
          href={`/typebots/${typebot?.id}/edit`}
          colorScheme={router.pathname.includes('/edit') ? 'red' : 'gray'}
          variant={router.pathname.includes('/edit') ? 'outline' : 'ghost'}
          size="sm"
        >
          {t('editor.headers.flowButton.label')}
        </Button>
        <Button
          as={Link}
          href={`/typebots/${typebot?.id}/theme`}
          colorScheme={router.pathname.endsWith('theme') ? 'red' : 'gray'}
          variant={router.pathname.endsWith('theme') ? 'outline' : 'ghost'}
          size="sm"
        >
          {t('editor.headers.themeButton.label')}
        </Button>
        <Button
          as={Link}
          href={`/typebots/${typebot?.id}/settings`}
          colorScheme={router.pathname.endsWith('settings') ? 'red' : 'gray'}
          variant={router.pathname.endsWith('settings') ? 'outline' : 'ghost'}
          size="sm"
        >
          {t('editor.headers.settingsButton.label')}
        </Button>
        <Button
          as={Link}
          href={`/typebots/${typebot?.id}/share`}
          colorScheme={router.pathname.endsWith('share') ? 'red' : 'gray'}
          variant={router.pathname.endsWith('share') ? 'outline' : 'ghost'}
          size="sm"
        >
          {t('editor.headers.shareButton.label')}
        </Button>
        {isDefined(publishedTypebot) && (
          <Button
            as={Link}
            href={`/typebots/${typebot?.id}/results`}
            colorScheme={router.pathname.includes('results') ? 'red' : 'gray'}
            variant={router.pathname.includes('results') ? 'outline' : 'ghost'}
            size="sm"
          >
            {t('editor.headers.resultsButton.label')}
          </Button>
        )}
      </HStack>
      <HStack
        pos="absolute"
        left="1rem"
        justify="center"
        align="center"
        spacing="6"
      >
        <HStack alignItems="center" spacing={3}>
          <IconButton
            as={Link}
            aria-label="Navigate back"
            icon={<ChevronLeftIcon fontSize={25} />}
            href={{
              pathname: router.query.parentId
                ? '/typebots/[typebotId]/edit'
                : typebot?.folderId
                ? '/typebots/folders/[folderId]'
                : '/typebots',
              query: {
                folderId: typebot?.folderId ?? [],
                parentId: Array.isArray(router.query.parentId)
                  ? router.query.parentId.slice(0, -1)
                  : [],
                typebotId: Array.isArray(router.query.parentId)
                  ? [...router.query.parentId].pop()
                  : router.query.parentId ?? [],
              },
            }}
            size="sm"
          />
          <HStack spacing={1}>
            {typebot && (
              <EditableEmojiOrImageIcon
                uploadFileProps={{
                  workspaceId: typebot.workspaceId,
                  typebotId: typebot.id,
                  fileName: 'icon',
                }}
                icon={typebot?.icon}
                onChangeIcon={handleChangeIcon}
              />
            )}
            (
            <EditableTypebotName
              key={`typebot-name-${typebot?.name ?? ''}`}
              defaultName={typebot?.name ?? ''}
              onNewName={handleNameSubmit}
            />
            )
          </HStack>

          <HStack>
            <Tooltip
              label={isUndoShortcutTooltipOpen ? 'Changes reverted!' : 'Undo'}
              isOpen={isUndoShortcutTooltipOpen ? true : undefined}
              hasArrow={isUndoShortcutTooltipOpen}
            >
              <IconButton
                display={['none', 'flex']}
                icon={<UndoIcon />}
                size="sm"
                aria-label="Undo"
                onClick={undo}
                isDisabled={!canUndo}
              />
            </Tooltip>

            <Tooltip label="Redo">
              <IconButton
                display={['none', 'flex']}
                icon={<RedoIcon />}
                size="sm"
                aria-label="Redo"
                onClick={redo}
                isDisabled={!canRedo}
              />
            </Tooltip>
          </HStack>
          <Button leftIcon={<BuoyIcon />} onClick={handleHelpClick} size="sm">
            {t('editor.headers.helpButton.label')}
          </Button>
        </HStack>
        {isSavingLoading && (
          <HStack>
            <Spinner speed="0.7s" size="sm" color="gray.400" />
            <Text fontSize="sm" color="gray.400">
              {t('editor.headers.savingSpinner.label')}
            </Text>
          </HStack>
        )}
      </HStack>

      <HStack right="40px" pos="absolute" display={['none', 'flex']}>
        <Flex pos="relative">
          <CollaborationMenuButton isLoading={isNotDefined(typebot)} />
        </Flex>
        {router.pathname.includes('/edit') && isNotDefined(rightPanel) && (
          <Button
            colorScheme="gray"
            onClick={handlePreviewClick}
            isLoading={isNotDefined(typebot)}
            size="sm"
          >
            {t('editor.headers.previewButton.label')}
          </Button>
        )}
        <PublishButton size="sm" />
      </HStack>
    </Flex>
  )
}
