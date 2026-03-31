import type { UIMessage } from "@shared/schema";
import { BaristaAvatar } from "./BaristaAvatar";
import { SourceCitations } from "./SourceCitations";
import { FeedbackButtons } from "./FeedbackButtons";

interface MessageProps {
  message: UIMessage;
  onFeedback: (messageId: string, feedback: "positive" | "negative") => void;
}

export function Message({ message, onFeedback }: MessageProps) {
  const isUser = message.role === "user";
  const content = message.content || "";
  const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);

  const renderWithLinks = (text: string, keyPrefix: string) => {
    const urlPattern = /(https?:\/\/[^\s,)>\]]+[^\s,)>\].;:!?])/g;
    const urlTest = /^https?:\/\//;
    const parts = text.split(urlPattern);
    return parts.map((segment, i) => {
      if (urlTest.test(segment)) {
        return (
          <a
            key={`${keyPrefix}-link-${i}`}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            data-testid={`link-inline-${keyPrefix}-${i}`}
          >
            {segment}
          </a>
        );
      }
      return segment;
    });
  };

  const formatContent = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold">
            {renderWithLinks(part.slice(2, -2), `bold-${index}`)}
          </strong>
        );
      }
      return renderWithLinks(part, `text-${index}`);
    });
  };

  const getToolIndicator = () => {
    if (!message.toolsUsed) return null;
    const tools: string[] = [];
    if (message.toolsUsed.web_search) tools.push("Web Search");
    if (message.toolsUsed.x_search) tools.push("X Search");
    if (message.toolsUsed.funding_rate) tools.push("Funding Rate");
    if (message.toolsUsed.rag) tools.push("Docs");
    if (message.toolsUsed.monday_order) tools.push("Order Execution");
    if (message.toolsUsed.monday_order_error) tools.push("Order Error");
    if (tools.length === 0) return null;
    return tools.join(" • ");
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-message-in" data-testid={`message-user-${message.id}`}>
        <div className="max-w-[85%]">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-md px-4 py-3" data-testid={`message-content-${message.id}`}>
            <p className="text-sm whitespace-pre-wrap" data-testid={`message-text-${message.id}`}>{content}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right" data-testid={`message-timestamp-${message.id}`}>
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  }

  const toolIndicator = getToolIndicator();

  return (
    <div className="flex items-start gap-2 animate-message-in" data-testid={`message-assistant-${message.id}`}>
      <BaristaAvatar size="sm" animate={false} />
      <div className="max-w-[85%] flex flex-col">
        {toolIndicator && (
          <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary w-fit mb-1 flex items-center gap-1" data-testid={`message-tools-${message.id}`}>
            {toolIndicator}
          </span>
        )}
        <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3 border border-card-border" data-testid={`message-content-${message.id}`}>
          <p className="text-sm whitespace-pre-wrap text-card-foreground" data-testid={`message-text-${message.id}`}>
            {formatContent(content)}
          </p>
          {message.citations && message.citations.length > 0 && (
            <SourceCitations citations={message.citations} />
          )}
        </div>
        <div className="flex items-center justify-between mt-1 gap-2" data-testid={`message-footer-${message.id}`}>
          <p className="text-xs text-muted-foreground" data-testid={`message-timestamp-${message.id}`}>
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <FeedbackButtons
            messageId={message.id}
            currentFeedback={message.feedback || null}
            onFeedback={onFeedback}
          />
        </div>
      </div>
    </div>
  );
}
