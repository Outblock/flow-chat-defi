import { useEffect, useRef } from 'react';

interface ReactPreviewProps {
  code: string;
}

export function ReactPreview({ code }: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>React Preview</title>
        <style>
          body { margin: 0; padding: 0; }
        </style>
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script>
          try {
            ${code}
          } catch (err) {
            document.body.innerHTML = '<pre style="color:red;">' + err + '</pre>';
          }
        </script>
      </body>
      </html>
    `;

    const iframe = iframeRef.current;
    iframe.srcdoc = html;
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      title="React Preview"
      sandbox="allow-scripts"
      style={{ width: '100%', height: 400, border: '1px solid #eee', background: '#fff' }}
    />
  );
} 