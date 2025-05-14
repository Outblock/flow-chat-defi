import { Artifact } from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import {
  Console,
  ConsoleOutput,
  ConsoleOutputContent,
} from '@/components/console';
// @ts-expect-error: No types for @babel/standalone
import * as Babel from '@babel/standalone';

interface Metadata {
  outputs: Array<ConsoleOutput>;
}

export const codeArtifact = new Artifact<'code', Metadata>({
  kind: 'code',
  description:
    'Useful for code generation; Code execution is available for JavaScript/React code.',
  initialize: async ({ setMetadata }) => {
    setMetadata({
      outputs: [],
    });
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'code-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    return (
      <>
        <div className="px-1">
          <CodeEditor {...props} />
        </div>
      </>
    );
  },
  actions: [
    {
      icon: <PlayIcon size={18} />,
      label: 'Run',
      description: 'Execute code',
      onClick: async ({ content, setMetadata }) => {
        console.log('content ->', content);
        let transpiledCode = '';
        let error: any = null;
        try {
          transpiledCode = Babel.transform(content, {
            presets: ['react', 'env'],
          }).code || '';
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              {
                id: 'preview',
                contents: [{ type: 'text', value: transpiledCode }],
                status: 'completed',
              },
            ],
          }));
        } catch (e: any) {
          console.log('error ->', e);
          error = e;
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              {
                id: 'preview',
                contents: [{ type: 'text', value: error.message }],
                status: 'failed',
              },
            ],
          }));
        }
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy code to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Add comments',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add comments to the code snippet for understanding',
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: 'Add logs',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add logs to the code snippet for debugging',
        });
      },
    },
  ],
});
