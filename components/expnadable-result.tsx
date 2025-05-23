import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ToolResultExpandable({
  toolName,
  args,
  result,
}: {
  toolName: string;
  args: any;
  result: any;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to check if a string is valid JSON
  function tryParseJson(text: string) {
    try {
      return [JSON.parse(text), true];
    } catch {
      return [null, false];
    }
  }

  let responseContent: JSX.Element | null = null;
  if (result && result.content) {
    if (Array.isArray(result.content)) {
      responseContent = (
        <div className="flex flex-col gap-2">
          {result.content.map((item: any, idx: number) => {
            if (typeof item.text === "string") {
              const [parsed, isJson] = tryParseJson(item.text);
              if (isJson) {
                return (
                  <pre
                    key={idx}
                    className="bg-background rounded p-2 text-xs overflow-x-auto border"
                  >
                    <code>{JSON.stringify(parsed, null, 2)}</code>
                  </pre>
                );
              } else {
                return (
                  <pre
                    key={idx}
                    className="bg-background rounded p-2 text-xs overflow-x-auto border"
                  >
                    <code>{item.text}</code>
                  </pre>
                );
              }
            } else {
              return (
                <pre
                  key={idx}
                  className="bg-background rounded p-2 text-xs overflow-x-auto border"
                >
                  <code>{JSON.stringify(item, null, 2)}</code>
                </pre>
              );
            }
          })}
        </div>
      );
    } else if (typeof result.content.text === "string") {
      const [parsed, isJson] = tryParseJson(result.content.text);
      if (isJson) {
        responseContent = (
          <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } else {
        responseContent = (
          <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
            <code>{result.content.text}</code>
          </pre>
        );
      }
    } else {
      responseContent = (
        <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
          <code>{JSON.stringify(result.content, null, 2)}</code>
        </pre>
      );
    }
  } else {
    responseContent = (
      <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
        <code>{JSON.stringify(result, null, 2)}</code>
      </pre>
    );
  }

  return (
    <div className="flex flex-col border rounded-lg bg-muted/30">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 font-medium text-left w-full hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
      >
        <span className="flex-1">
          <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10 mr-2">
            MCP
          </span>
          {toolName}
        </span>
        <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDownIcon />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
            className="px-3 pb-3 flex flex-col gap-3"
          >
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">
                Request
              </div>
              <pre className="bg-background rounded p-2 text-xs overflow-x-auto border">
                <code>{JSON.stringify(args, null, 2)}</code>
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1 text-muted-foreground">
                Response
              </div>
              {responseContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
