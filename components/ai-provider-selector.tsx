'use client';

import { startTransition, useMemo, useOptimistic, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import type { AIProviderType } from '@/lib/ai/providers';
import { ClaudeIcon, GrokIcon, OpenAIIcon } from './icons';

const aiProviders = [
  {
    id: 'claude' as const,
    name: 'Claude',
    description: 'Anthropic Claude',
    icon: <ClaudeIcon size={20} />,
  },
  {
    id: 'xai' as const,
    name: 'xAI',
    description: 'xAI Grok',
    icon: <GrokIcon size={20} className="text-blue-500" />,
  },
  {
    id: 'openai' as const,
    name: 'OpenAI',
    description: 'OpenAI GPT-4',
    icon: <OpenAIIcon size={20} />,
  },
];

function saveAiProviderAsCookie(providerId: AIProviderType) {
  document.cookie = `ai-provider=${providerId}; path=/`;
}

export function AiProviderSelector({
  selectedProviderId,
  className,
}: {
  selectedProviderId: AIProviderType;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticProviderId, setOptimisticProviderId] =
    useOptimistic(selectedProviderId);

  const selectedProvider = useMemo(
    () => aiProviders.find((provider) => provider.id === optimisticProviderId),
    [optimisticProviderId],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          variant="outline"
          className="md:px-2 md:h-[34px] flex items-center gap-2"
        >
          {selectedProvider?.icon}
          <span className="truncate">{selectedProvider?.name}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {aiProviders.map((provider) => {
          const { id, name, description, icon } = provider;
          const isSelected = id === optimisticProviderId;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => {
                setOpen(false);
                startTransition(() => {
                  setOptimisticProviderId(id);
                  saveAiProviderAsCookie(id);
                  window.location.reload();
                });
              }}
            >
              <div className="flex flex-1 items-start gap-3 p-1">
                {icon}
                <div className="flex flex-col flex-1">
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">
                    {description}
                  </div>
                </div>
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-foreground" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 