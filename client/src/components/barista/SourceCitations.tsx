import { ExternalLink } from "lucide-react";
import type { Citation } from "@shared/schema";

interface SourceCitationsProps {
  citations: Citation[];
}

export function SourceCitations({ citations }: SourceCitationsProps) {
  if (!citations || citations.length === 0) return null;

  const getTypeIcon = (type: Citation['type']) => {
    switch (type) {
      case 'docs':
        return 'Docs';
      case 'x':
        return 'X';
      case 'web':
        return 'Web';
      default:
        return 'Link';
    }
  };

  return (
    <div className="mt-2 p-2 rounded-lg bg-black/20" data-testid="source-citations">
      <p className="text-xs text-muted-foreground mb-1.5" data-testid="citations-label">Sources:</p>
      <div className="flex flex-col gap-1" data-testid="citations-list">
        {citations.map((citation, index) => (
          <a
            key={index}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors group"
            data-testid={`citation-link-${index}`}
          >
            <span data-testid={`citation-icon-${index}`}>{getTypeIcon(citation.type)}</span>
            <span className="truncate max-w-[280px]" data-testid={`citation-title-${index}`}>{citation.title}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
