"use client";

import {
  startTransition,
  useMemo,
  useOptimistic,
  useState,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { AIProviderType } from "@/lib/ai/providers";
import { ClaudeIcon, GrokIcon, OpenAIIcon } from "./icons";

const providerConfig = {
  Claude: {
    icon: <ClaudeIcon />,
    models: [
      {
        id: "claude-opus-4" as const,
        name: "Claude Opus 4",
        description: "Latest Claude Opus 4 model",
      },
      {
        id: "claude-sonnet-4" as const,
        name: "Claude Sonnet 4",
        description: "Latest Claude Sonnet 4 model",
      },
      {
        id: "claude-3-7-sonnet" as const,
        name: "Claude 3.7 Sonnet",
        description: "Claude 3.7 Sonnet model",
      },
      {
        id: "claude-3-5-haiku" as const,
        name: "Claude 3.5 Haiku",
        description: "Fast and efficient Claude 3.5 Haiku",
      },
      {
        id: "claude-3-5-sonnet" as const,
        name: "Claude 3.5 Sonnet",
        description: "Original Claude 3.5 Sonnet",
      },
    ],
  },
  Grok: {
    icon: <GrokIcon className="text-blue-500" />,
    models: [
      {
        id: "grok-3-beta" as const,
        name: "Grok 3 Beta",
        description: "Latest Grok 3 model with full capabilities",
      },
      {
        id: "grok-3-fast-beta" as const,
        name: "Grok 3 Fast Beta",
        description: "Optimized for speed with balanced performance",
      },
      {
        id: "grok-3-mini-beta" as const,
        name: "Grok 3 Mini Beta",
        description: "Lightweight and efficient version",
      },
      {
        id: "grok-2" as const,
        name: "Grok 2",
        description: "Stable Grok 2 release",
      },
    ],
  },
  OpenAI: {
    icon: <OpenAIIcon />,
    models: [
      {
        id: "gpt-4o-mini" as const,
        name: "GPT-4o Mini",
        description: "Efficient version of GPT-4o",
      },
      {
        id: "gpt-4.1" as const,
        name: "GPT-4.1",
        description: "Full GPT-4.1 model",
      },
      {
        id: "gpt-4.1-mini" as const,
        name: "GPT-4.1 Mini",
        description: "Lightweight GPT-4.1 model",
      },
      {
        id: "o4-mini" as const,
        name: "GPT-O4 Mini",
        description: "Original GPT-O4 model",
      },
    ],
  },
};

const claudeProviders = providerConfig.Claude.models.map((model) => ({
  ...model,
  icon: providerConfig.Claude.icon,
  group: "Claude",
}));

const grokProviders = providerConfig.Grok.models.map((model) => ({
  ...model,
  icon: providerConfig.Grok.icon,
  group: "Grok",
}));

const openaiProviders = providerConfig.OpenAI.models.map((model) => ({
  ...model,
  icon: providerConfig.OpenAI.icon,
  group: "OpenAI",
}));

const allProviders = [...claudeProviders, ...grokProviders, ...openaiProviders];

export function AiProviderSelector({
  className,
}: React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [optimisticProviderId, setOptimisticProviderId] =
    useState("claude-3-5-haiku");

  useEffect(() => {
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return "claude-3-5-haiku";
      return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1];
    };
    const cookieValue = getCookie("ai-provider");
    if (cookieValue) setOptimisticProviderId(cookieValue);
  }, []);

  const groupOrder = ["Claude", "Grok", "OpenAI"];

  const selectedProvider = useMemo(
    () => allProviders.find((provider) => provider.id === optimisticProviderId),
    [optimisticProviderId]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button
          variant="outline"
          className="md:px-2 md:h-[34px] flex items-center gap-2"
        >
          {selectedProvider?.icon}
          <span className="hidden md:block truncate">{selectedProvider?.name}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[240px] max-h-[400px] overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(155, 155, 155, 0.5) transparent",
        }}
      >
        <style jsx global>{`
          /* Webkit (Chrome, Safari, etc) */
          .overflow-y-auto::-webkit-scrollbar {
            width: 6px;
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: transparent;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background-color: rgba(155, 155, 155, 0.5);
            border-radius: 3px;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background-color: rgba(155, 155, 155, 0.7);
          }
          /* 添加一些内边距防止滚动条遮挡内容 */
          .overflow-y-auto {
            padding-right: 4px;
          }
        `}</style>
        {groupOrder.map((groupName) => {
          const providers = allProviders.filter((p) => p.group === groupName);
          if (providers.length === 0) return null;

          return (
            <div key={groupName}>
              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 font-semibold">
                {groupName}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {providers.map((provider) => {
                  const { id, name, description, icon } = provider;
                  const isSelected = id === optimisticProviderId;

                  return (
                    <DropdownMenuItem
                      key={id}
                      onSelect={() => {
                        setOpen(false);
                        startTransition(() => {
                          setOptimisticProviderId(id);
                          document.cookie = `ai-provider=${id}; path=/; max-age=31536000`;
                          // window.location.reload();
                        });
                      }}
                      className="py-2"
                    >
                      <div className="flex flex-1 items-start gap-3 p-1">
                        <div className="flex-shrink-0 mt-1">{icon}</div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="font-medium truncate">{name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {description}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 text-foreground flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
              {groupName !== "OpenAI" && (
                <DropdownMenuSeparator className="my-1" />
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
