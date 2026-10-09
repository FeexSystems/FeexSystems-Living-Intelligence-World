import { useEffect } from 'react';

interface StructuredDataProps {
  schema: Record<string, any>;
}

export function StructuredData({ schema }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'agentic-json-ld';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [schema]);

  return null;
}
