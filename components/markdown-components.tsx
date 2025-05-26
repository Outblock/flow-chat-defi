import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";

export const customComponents = {
  customcomponent: ({ animateText, node, children, ...props }: any) => (
    <>{animateText(<div {...props}>{children}</div>)}</>
  ),

  code: CodeBlock,
  pre: ({ children }: any) => <>{children}</>,

  ol: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <ol className="list-decimal list-outside ml-4" {...rest}>
            {children}
          </ol>
        )}
      </>
    );
  },
  li: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <li className="py-1" {...rest}>
        {animateText(children)}
      </li>
    );
  },
  ul: (props: any) => {
    const { animateText, node, children, ...rest } = props;
    return (
      <>
        {animateText(
          <ul className="list-decimal list-outside ml-4" {...rest}>
            {children}
          </ul>
        )}
      </>
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
          <h1 className="text-3xl font-semibold mt-6 mb-2" {...rest}>
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
          <h2 className="text-2xl font-semibold mt-6 mb-2" {...rest}>
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
          <h3 className="text-xl font-semibold mt-6 mb-2" {...rest}>
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
          <h4 className="text-lg font-semibold mt-6 mb-2" {...rest}>
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
          <h5 className="text-base font-semibold mt-6 mb-2" {...rest}>
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
          <h6 className="text-sm font-semibold mt-6 mb-2" {...rest}>
            {children}
          </h6>
        )}
      </>
    );
  },
};
