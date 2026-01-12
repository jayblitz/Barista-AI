import { BaristaChat } from "@/components/barista";
import { BaristaAvatar } from "@/components/barista/BaristaAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExternalLink, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BaristaAvatar size="sm" animate={false} />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Monday Trade</h1>
              <p className="text-xs text-muted-foreground">Powered by Barista AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a
              href="https://app.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="default" className="gap-2" data-testid="launch-app-button">
                Launch App
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-20" data-testid="hero-section">
          <div className="flex justify-center mb-6">
            <BaristaAvatar size="lg" animate={true} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="hero-title">
            Meet <span className="text-primary">Barista</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="hero-description">
            Your AI-powered assistant for Monday Trade. Ask questions about trading, 
            fees, leverage, and everything you need to know to start your trading journey.
          </p>
          <div className="flex flex-wrap justify-center gap-3" data-testid="hero-badges">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm" data-testid="badge-kyc">
              <Shield className="w-4 h-4" />
              No KYC Required
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-chart-2/10 text-chart-2 text-sm" data-testid="badge-access">
              <Zap className="w-4 h-4" />
              Open Access
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-chart-3/10 text-chart-3 text-sm" data-testid="badge-leverage">
              <TrendingUp className="w-4 h-4" />
              Up to 10x Leverage
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-20" data-testid="features-section">
          <Card className="bg-card" data-testid="card-feature-fees">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4" data-testid="icon-fees">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2" data-testid="title-fees">Low Trading Fees</h3>
              <p className="text-sm text-muted-foreground" data-testid="description-fees">
                Market orders at <strong className="text-primary">0.02%</strong> and limit orders at{" "}
                <strong className="text-primary">0.00%</strong> with maker rebates.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card" data-testid="card-feature-pairs">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4" data-testid="icon-pairs">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2" data-testid="title-pairs">Trading Pairs</h3>
              <p className="text-sm text-muted-foreground" data-testid="description-pairs">
                Trade <strong className="text-chart-2">BTC/USDC</strong>,{" "}
                <strong className="text-chart-2">ETH/USDC</strong>, and{" "}
                <strong className="text-chart-2">MON/USDC</strong> with precision.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card" data-testid="card-feature-voyage">
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4" data-testid="icon-voyage">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2" data-testid="title-voyage">Voyage Points</h3>
              <p className="text-sm text-muted-foreground" data-testid="description-voyage">
                Earn from <strong className="text-chart-4">2M points weekly</strong> through trading, LP, 
                holding, and referrals.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="text-center py-16 px-8 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-chart-2/10 border border-border" data-testid="cta-section">
          <h3 className="text-2xl font-bold text-foreground mb-3" data-testid="cta-title">
            Ready to Start Trading?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto" data-testid="cta-description">
            Click the chat bubble in the corner to ask Barista any questions, or launch the app to start trading now.
          </p>
          <div className="flex flex-wrap justify-center gap-4" data-testid="cta-buttons">
            <a
              href="https://app.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2" data-testid="button-start-trading">
                Start Trading
                <TrendingUp className="w-5 h-5" />
              </Button>
            </a>
            <a
              href="https://docs.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="gap-2" data-testid="button-read-docs">
                Read Documentation
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-16" data-testid="footer">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p data-testid="footer-tagline">Monday Trade - Perpetuals Trading on Monad</p>
          <div className="flex items-center gap-4" data-testid="footer-links">
            <a
              href="https://docs.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
              data-testid="link-docs"
            >
              Docs
            </a>
            <a
              href="https://x.com/MondayTrade_"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
              data-testid="link-twitter"
            >
              X / Twitter
            </a>
            <a
              href="https://app.monday.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
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
