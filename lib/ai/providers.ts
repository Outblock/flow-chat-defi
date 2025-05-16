import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

const claudeModel = {
  'chat-model': anthropic('claude-3-5-haiku-20241022'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-7-sonnet-20250219'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-5-haiku-20241022'),
  'artifact-model': anthropic('claude-3-5-haiku-20241022'),
}

const xAIModel = {
  'chat-model': xai('grok-2-vision-1212'),
  'chat-model-reasoning': wrapLanguageModel({
    model: xai('grok-3-mini-beta'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': xai('grok-2-1212'),
  'artifact-model': xai('grok-2-1212'),
}

const openaiModel = {
  'chat-model': openai('gpt-4o'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-4o'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-4o'),
  'artifact-model': openai('gpt-4o'),
}

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: xAIModel,
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
