import Link from "next/link";
import React, { memo } from "react";
import { CodeBlock } from "./code-block";

export const customComponents = {
  code: CodeBlock,
  pre: ({ children }: any) => <>{children}</>,

  table: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <table
        className="border-collapse border border-zinc-200 dark:border-zinc-700 rounded-xl w-full"
        {...rest}
      >
        {children}
      </table>
    );
  },

  thead: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <thead
        className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700"
        {...rest}
      >
        {children}
      </thead>
    );
  },

  th: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <th className=" border-zinc-200 dark:border-zinc-700 px-4 py-2" {...rest}>
        <div className="flex items-center justify-center">{children}</div>
      </th>
    );
  },

  tr: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <tr
        className="even:bg-zinc-50 dark:even:bg-zinc-900 border-zinc-200 dark:border-zinc-700 px-4 py-2"
        {...rest}
      >
        {children}
      </tr>
    );
  },

  td: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <td
        className=" border-zinc-200 dark:border-zinc-700 px-4 py-2 text-left w-auto"
        {...rest}
      >
        <div className="flex items-center justify-start">{children}</div>
      </td>
    );
  },

  ol: ({ node, children, ...props }: any) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }: any) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }: any) => {
    return (
      <ul className="list-disc list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },

  strong: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <span className="font-semibold" {...rest}>
            {children}
          </span>
        )}
      </>
    );
  },
  a: ({ animateText, node, children, ...props }: any) => (
    <Link
      className="text-blue-500 hover:underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </Link>
  ),

  h1: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h1 className="text-3xl font-semibold mt-2" {...rest}>
            {children}
          </h1>
        )}
      </>
    );
  },
  h2: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h2 className="text-2xl font-semibold mt-2" {...rest}>
            {children}
          </h2>
        )}
      </>
    );
  },
  h3: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h3 className="text-xl font-semibold mt-2" {...rest}>
            {children}
          </h3>
        )}
      </>
    );
  },
  h4: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h4 className="text-lg font-semibold mt-2" {...rest}>
            {children}
          </h4>
        )}
      </>
    );
  },
  h5: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h5 className="text-base font-semibold mt-2" {...rest}>
            {children}
          </h5>
        )}
      </>
    );
  },
  h6: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <h6 className="text-sm font-semibold mt-2" {...rest}>
            {children}
          </h6>
        )}
      </>
    );
  },
};
