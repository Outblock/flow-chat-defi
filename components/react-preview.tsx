import { useEffect, useRef } from 'react';

interface ReactPreviewProps {
  code: string;
}

export function ReactPreview({ code }: ReactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    console.log('ReactPreview ->', iframeRef.current, code)
    if (!iframeRef.current) return;

    console.log('ReactPreview 111 ->')
    const html = code;
    const iframe = iframeRef.current;
    iframe.srcdoc = html;
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      title="React Preview"
      sandbox="allow-scripts"
      style={{ width: '100%', height: '100%', background: '#000' }}
    />
  );
} 