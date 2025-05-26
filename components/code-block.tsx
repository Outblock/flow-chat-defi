"use client";

import React from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

const CopyButton = ({
  onClick,
  size = 16,
  className,
}: {
  onClick: () => void;
  size?: number;
  className?: string;
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleClick = () => {
    onClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className={`opacity-0 group-hover:opacity-100 transition-opacity absolute p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg ${className}`}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
};

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const handleCopy = () => {
    if (typeof children === "string") {
      navigator.clipboard.writeText(children);
    }
  };
  if (!inline) {
    const isOneLine = typeof children === "string" && !children.includes("\n");
    return (
      <div className="not-prose flex flex-col relative group">
        {!isOneLine && (
          <CopyButton onClick={handleCopy} className="top-2 right-2" />
        )}
        <pre
          {...props}
          className={`text-sm w-full overflow-x-auto dark:bg-zinc-900 ${
            isOneLine ? "p-1" : "p-4"
          } border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900`}
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <div className="relative inline-block group">
        <CopyButton
          onClick={handleCopy}
          size={12}
          className="-top-2 -right-2"
        />
        <code
          className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
          {...props}
        >
          {children}
        </code>
      </div>
    );
  }
}
