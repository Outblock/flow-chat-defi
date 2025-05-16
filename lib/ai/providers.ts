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

const claude37SonnetModel = {
  'chat-model': anthropic('claude-3-7-sonnet-20250219'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-7-sonnet-20250219'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-7-sonnet-20250219'),
  'artifact-model': anthropic('claude-3-7-sonnet-20250219'),
}

const claude35HaikuModel = {
  'chat-model': anthropic('claude-3-5-haiku-20241022'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-5-haiku-20241022'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-5-haiku-20241022'),
  'artifact-model': anthropic('claude-3-5-haiku-20241022'),
}

const claude35SonnetV2Model = {
  'chat-model': anthropic('claude-3-5-sonnet-20241022'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-5-sonnet-20241022'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-5-sonnet-20241022'),
  'artifact-model': anthropic('claude-3-5-sonnet-20241022'),
}

const claude35SonnetModel = {
  'chat-model': anthropic('claude-3-5-sonnet-20240620'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-5-sonnet-20240620'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-5-sonnet-20240620'),
  'artifact-model': anthropic('claude-3-5-sonnet-20240620'),
}

const claude3OpusModel = {
  'chat-model': anthropic('claude-3-opus-20240229'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-opus-20240229'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-opus-20240229'),
  'artifact-model': anthropic('claude-3-opus-20240229'),
}

const claude3SonnetModel = {
  'chat-model': anthropic('claude-3-sonnet-20240229'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-sonnet-20240229'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-sonnet-20240229'),
  'artifact-model': anthropic('claude-3-sonnet-20240229'),
}

const claude3HaikuModel = {
  'chat-model': anthropic('claude-3-haiku-20240307'),
  'chat-model-reasoning': wrapLanguageModel({
    model: anthropic('claude-3-haiku-20240307'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': anthropic('claude-3-haiku-20240307'),
  'artifact-model': anthropic('claude-3-haiku-20240307'),
}

const grok2Model = {
  'chat-model': xai('grok-2-1212'),
  'chat-model-reasoning': wrapLanguageModel({
    model: xai('grok-2-1212'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': xai('grok-2-1212'),
  'artifact-model': xai('grok-2-1212'),
}

const grok3BetaModel = {
  'chat-model': xai('grok-3-beta'),
  'chat-model-reasoning': wrapLanguageModel({
    model: xai('grok-3-beta'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': xai('grok-3-beta'),
  'artifact-model': xai('grok-3-beta'),
}

const grok3FastBetaModel = {
  'chat-model': xai('grok-3-fast-beta'),
  'chat-model-reasoning': wrapLanguageModel({
    model: xai('grok-3-fast-beta'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': xai('grok-3-fast-beta'),
  'artifact-model': xai('grok-3-fast-beta'),
}

const grok3MiniBetaModel = {
  'chat-model': xai('grok-3-mini-beta'),
  'chat-model-reasoning': wrapLanguageModel({
    model: xai('grok-3-mini-beta'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': xai('grok-3-mini-beta'),
  'artifact-model': xai('grok-3-mini-beta'),
}

const openaiO4MiniModel = {
  'chat-model': openai('gpt-4-mini'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-4-mini'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-4-mini'),
  'artifact-model': openai('gpt-4-mini'),
}

const openaiO3Model = {
  'chat-model': openai('gpt-3'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-3'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-3'),
  'artifact-model': openai('gpt-3'),
}

const openaiO3MiniModel = {
  'chat-model': openai('gpt-3-mini'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-3-mini'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-3-mini'),
  'artifact-model': openai('gpt-3-mini'),
}

const openaiO1Model = {
  'chat-model': openai('gpt-1'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-1'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-1'),
  'artifact-model': openai('gpt-1'),
}

const openaiO1MiniModel = {
  'chat-model': openai('gpt-1-mini'),
  'chat-model-reasoning': wrapLanguageModel({
    model: openai('gpt-1-mini'),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  }),
  'title-model': openai('gpt-1-mini'),
  'artifact-model': openai('gpt-1-mini'),
}

export type AIProviderType = 
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
  | 'openai-o4-mini'
  | 'openai-o3'
  | 'openai-o3-mini'
  | 'openai-o1'
  | 'openai-o1-mini';

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
    case 'claude-3-7-sonnet':
      return customProvider({
        languageModels: claude37SonnetModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-5-haiku':
      return customProvider({
        languageModels: claude35HaikuModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-5-sonnet-v2':
      return customProvider({
        languageModels: claude35SonnetV2Model,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-5-sonnet':
      return customProvider({
        languageModels: claude35SonnetModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-opus':
      return customProvider({
        languageModels: claude3OpusModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-sonnet':
      return customProvider({
        languageModels: claude3SonnetModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'claude-3-haiku':
      return customProvider({
        languageModels: claude3HaikuModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'grok-2':
      return customProvider({
        languageModels: grok2Model,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'grok-3-beta':
      return customProvider({
        languageModels: grok3BetaModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'grok-3-fast-beta':
      return customProvider({
        languageModels: grok3FastBetaModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'grok-3-mini-beta':
      return customProvider({
        languageModels: grok3MiniBetaModel,
        imageModels: {
          'small-model': xai.image('grok-2-image'),
        },
      });
    case 'openai-o4-mini':
      return customProvider({
        languageModels: openaiO4MiniModel,
      });
    case 'openai-o3':
      return customProvider({
        languageModels: openaiO3Model,
      });
    case 'openai-o3-mini':
      return customProvider({
        languageModels: openaiO3MiniModel,
      });
    case 'openai-o1':
      return customProvider({
        languageModels: openaiO1Model,
      });
    case 'openai-o1-mini':
      return customProvider({
        languageModels: openaiO1MiniModel,
      });
  }
}

// Get provider from cookie or default to 'claude-3-5-haiku'
function getCurrentProvider(): AIProviderType {
  if (typeof window === 'undefined') return 'claude-3-5-haiku';
  return (document.cookie.match(/ai-provider=([^;]+)/)?.[1] || 'claude-3-5-haiku') as AIProviderType;
}

// Create a proxy to handle provider updates
const providerHandler = {
  get(target: any, prop: string) {
    const currentProvider = getProviderConfig(getCurrentProvider());
    return (currentProvider as any)[prop];
  }
};

export const myProvider = new Proxy({}, providerHandler);
