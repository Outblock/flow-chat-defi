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

export const providerPlatforms = {
  anthropic,
  xai,
  openai,
} as const;

function createModelConfig(provider: keyof typeof providerPlatforms, modelId: string) {
  const model = providerPlatforms[provider].languageModel(modelId);

  return {
    'chat-model': model,
    'chat-model-reasoning': wrapLanguageModel({
      model,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': model,
    'artifact-model': model,
  };
}

const claudeOpus4Model = createModelConfig('anthropic', 'claude-opus-4-20250514');
const claudeSonnet4Model = createModelConfig('anthropic', 'claude-sonnet-4-20250514');
const claude37SonnetModel = createModelConfig('anthropic', 'claude-3-7-sonnet-20250219');
const claude35HaikuModel = createModelConfig('anthropic', 'claude-3-5-haiku-20241022');
const claude35SonnetV2Model = createModelConfig('anthropic', 'claude-3-5-sonnet-20241022');
const claude35SonnetModel = createModelConfig('anthropic', 'claude-3-5-sonnet-20240620');
const claude3OpusModel = createModelConfig('anthropic', 'claude-3-opus-20240229');
const claude3SonnetModel = createModelConfig('anthropic', 'claude-3-sonnet-20240229');
const claude3HaikuModel = createModelConfig('anthropic', 'claude-3-haiku-20240307');

const grok2Model = createModelConfig('xai', 'grok-2-1212');
const grok3BetaModel = createModelConfig('xai', 'grok-3-beta');
const grok3FastBetaModel = createModelConfig('xai', 'grok-3-fast-beta');
const grok3MiniBetaModel = createModelConfig('xai', 'grok-3-mini-beta');

const openai4oMiniModel = createModelConfig('openai', 'gpt-4o-mini');
const openai41MiniModel = createModelConfig('openai', 'gpt-4.1-mini');
const openai41Model = createModelConfig('openai', 'gpt-4.1');
const openaiO4MiniModel = createModelConfig('openai', 'o4-mini');

export type AIProviderType = 
  | 'claude-opus-4'
  | 'claude-sonnet-4'
  | 'claude-3-7-sonnet'
  | 'claude-3-5-haiku'
  | 'claude-3-5-sonnet-v2'
  | 'claude-3-5-sonnet'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'
  | 'grok-2'
  | 'grok-3-beta'
  | 'grok-3-fast-beta'
  | 'grok-3-mini-beta'
  | 'gpt-4o-mini'
  | 'gpt-4.1-mini'
  | 'gpt-4.1'
  | 'o4-mini';

const providerModels: Record<AIProviderType, any> = {
  'claude-opus-4': claudeOpus4Model,
  'claude-sonnet-4': claudeSonnet4Model,
  'claude-3-7-sonnet': claude37SonnetModel,
  'claude-3-5-haiku': claude35HaikuModel,
  'claude-3-5-sonnet-v2': claude35SonnetV2Model,
  'claude-3-5-sonnet': claude35SonnetModel,
  'claude-3-opus': claude3OpusModel,
  'claude-3-sonnet': claude3SonnetModel,
  'claude-3-haiku': claude3HaikuModel,
  'grok-2': grok2Model,
  'grok-3-beta': grok3BetaModel,
  'grok-3-fast-beta': grok3FastBetaModel,
  'grok-3-mini-beta': grok3MiniBetaModel,
  'o4-mini': openaiO4MiniModel,
  'gpt-4.1': openai41Model,
  'gpt-4.1-mini': openai41MiniModel,
  'gpt-4o-mini': openai4oMiniModel,
}

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

  // Map provider IDs to their language models
  const providerModel = providerModels[providerId];

  // OpenAI providers don't use image models
  const isOpenAI = providerId.startsWith('openai-');
  
  return customProvider({
    languageModels: providerModel,
    ...(!isOpenAI && {
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      }
    })
  });
}

// Get provider from cookie or default to 'claude-3-5-haiku'
function getCurrentProvider(providerId?: AIProviderType): AIProviderType {
  if (providerId) return providerId;
  return 'claude-3-5-haiku';
}

// Create a proxy to handle provider updates
const providerHandler = {
  get(target: any, prop: string) {
    return (...args: any[]) => {
      // Check if first argument is a provider ID
      const providerId = typeof args[0] === 'string' && args[0] in providerModels ? 
        args[0] as AIProviderType : 
        undefined;
      
      // Remove provider ID from args if it was passed
      const modelArgs = providerId ? args.slice(1) : args;

      // Get provider config with optional provider ID
      const currentProvider = getProviderConfig(getCurrentProvider(providerId));

      // Call the provider method with remaining args
      return (currentProvider as any)[prop](...modelArgs);
    };
  }
};

// Export proxy that allows optional provider ID as first argument
export const myProvider = new Proxy({}, providerHandler);
