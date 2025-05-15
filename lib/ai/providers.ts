import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
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

export type AIProviderType = 'claude' | 'xai';

function getProviderConfig(providerId: AIProviderType) {
  if (isTestEnvironment) {
    return customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    });
  }

  switch (providerId) {
    case 'xai':
      return customProvider({
        languageModels: xAIModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude':
    default:
      return customProvider({
        languageModels: claudeModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
  }
}

// Get provider from cookie or default to 'claude'
function getCurrentProvider(): AIProviderType {
  if (typeof window === 'undefined') return 'claude';
  return (document.cookie.match(/ai-provider=([^;]+)/)?.[1] || 'claude') as AIProviderType;
}

// Create a proxy to handle provider updates
const providerHandler = {
  get(target: any, prop: string) {
    const currentProvider = getProviderConfig(getCurrentProvider());
    return currentProvider[prop];
  }
};

export const myProvider = new Proxy({}, providerHandler);
