"use client";
import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { codeToHtml } from "shiki";
import { useTheme } from 'next-themes';

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

  const { theme } = useTheme();
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    const loadHighlightedCode = async () => {
      const bgColor = theme === "dark" ? "#18181B" : "#ffffff";
      const selectTheme = theme === "dark" ? "ayu-dark" : "github-light";
      console.log("theme themethemetheme ==>", theme, selectTheme);
      const highlighted = await codeToHtml(children, {
        lang: "cadence",
        theme: selectTheme,
        colorReplacements: {
          "#0b0e14": bgColor,
        },
      });
      setHtml(highlighted);
    };
    loadHighlightedCode();
  }, [children, theme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
  };

  const isOneLine = typeof children === "string" && !children.includes("\n");

  if (isOneLine) {
    return (
      <code className="whitespace-pre-wrap break-words text-orange-500 p-1 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-sm">
        {children}
      </code>
    );
  }

  if (!html) {
    return (
      <div className="not-prose flex flex-col relative group">
        {!isOneLine && (
          <CopyButton onClick={handleCopy} className="top-2 right-2" />
        )}
        <pre
          {...props}
          className={`text-sm w-full overflow-x-auto dark:bg-zinc-900 ${
            isOneLine ? "p-1" : "p-4"
          } border border-zinc-200 dark:border-zinc-700 ${
            isOneLine ? "rounded-sm" : "rounded-xl"
          } dark:text-zinc-50 text-zinc-900`}
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="not-prose flex flex-col relative group">
      <CopyButton onClick={handleCopy} className="top-2 right-2" />
      <div
        className="text-sm w-full overflow-x-auto dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl dark:text-zinc-50 text-zinc-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
