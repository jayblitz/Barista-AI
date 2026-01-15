import { BaristaChat } from "@/components/barista";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExternalLink, MessageCircle, Coffee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

function MondayTradeLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`w-10 h-10 rounded-lg bg-primary flex items-center justify-center ${className}`} data-testid="monday-trade-logo">
      <Coffee className="w-5 h-5 text-primary-foreground" />
    </div>
  );
}

function ChatPreview() {
  return (
    <Card className="w-full max-w-md shadow-lg" data-testid="chat-preview-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Barista</span>
              <Coffee className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Monday Trade Assistant</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm text-sm max-w-[80%]" data-testid="chat-user-message">
            How do I set a stop loss?
          </div>
        </div>
        <div className="space-y-2">
          <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm text-sm max-w-[95%]" data-testid="chat-bot-message">
            <p className="font-medium mb-2">Coming right up! Here's how:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open your position</li>
              <li>Click "Risk Management"</li>
              <li>Enter stop loss price</li>
              <li>Confirm</li>
            </ol>
            <p className="text-primary mt-3 font-medium">Smart thinking! That's what successful traders do.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  const handleAskBarista = () => {
    const chatWidget = document.querySelector('[data-testid="floating-chat-bubble"]');
    if (chatWidget) {
      (chatWidget as HTMLButtonElement).click();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MondayTradeLogo />
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-lg">Monday Trade</span>
              <span className="text-muted-foreground font-normal">x Barista</span>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="https://docs.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
              data-testid="link-docs-header"
            >
              Docs
            </a>
            <a
              href="https://app.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button data-testid="launch-app-button">
                Launch App
              </Button>
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center" data-testid="hero-section">
          <div className="space-y-8">
            <Badge variant="secondary" className="gap-2 text-sm px-4 py-2" data-testid="badge-introducing">
              <Coffee className="w-4 h-4" />
              Introducing Barista AI
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight" data-testid="hero-title">
              <span className="text-foreground">Your friendly</span>
              <br />
              <span className="text-primary">trading companion</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed" data-testid="hero-description">
              Meet Barista - the AI assistant that knows Monday Trade inside out. Get instant answers about perpetuals, positions, leverage, and more. Like having a knowledgeable friend who's always ready to help.
            </p>
            
            <div className="flex flex-wrap gap-4" data-testid="hero-buttons">
              <Button size="lg" className="gap-2" onClick={handleAskBarista} data-testid="button-ask-barista">
                <MessageCircle className="w-5 h-5" />
                Ask Barista
                <ExternalLink className="w-4 h-4" />
              </Button>
              <a
                href="https://docs.monday.trade"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" data-testid="button-read-docs">
                  Read the Docs
                </Button>
              </a>
            </div>
          </div>
          
          <div className="flex justify-center lg:justify-end" data-testid="hero-chat-preview">
            <ChatPreview />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-16" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p data-testid="footer-tagline">Monday Trade - Perpetuals Trading on Monad</p>
          <div className="flex items-center gap-6" data-testid="footer-links">
            <a
              href="https://docs.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="link-docs"
            >
              Docs
            </a>
            <a
              href="https://x.com/MondayTrade_"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="link-twitter"
            >
              X / Twitter
            </a>
            <a
              href="https://app.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              data-testid="link-trade"
            >
              Trade Now
            </a>
          </div>
        </div>
      </footer>

      <BaristaChat />
    </div>
  );
}
