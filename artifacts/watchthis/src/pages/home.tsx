import { useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import {
  Code2,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Globe,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useContent } from '@/content/content-context';

export default function Home() {
  const [url, setUrl] = useState('');
  const [, setLocation] = useLocation();

  const content = useContent('page:home', {
    heroTitle: 'Watch What Google Sees',
    heroSubtitle:
      'Compare raw HTML with the rendered DOM and discover JavaScript SEO issues before they affect indexing.',
  });

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setLocation(`/tools/javascript-seo-checker?url=${encodeURIComponent(url)}`);
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'WatchThis - JavaScript SEO Render Checker',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Compare raw HTML with the rendered DOM and discover JavaScript SEO issues before they affect indexing.',
  };

  return (
    <>
      <Seo
        title="Watch What Google Sees"
        description="Compare raw HTML with the rendered DOM and discover JavaScript SEO issues before they affect indexing. Free JavaScript SEO checker for developers."
        path="/"
        jsonLd={jsonLd}
      />
      <div className="min-h-[100dvh] flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="container mx-auto px-4 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
                <Zap className="w-4 h-4" />
                Free Developer Tool
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold mb-6 tracking-tight animate-slide-up">
                {content.heroTitle}
              </h1>

              <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up animate-stagger-1">
                {content.heroSubtitle}
              </p>

              <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto animate-slide-up animate-stagger-2">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 h-12 text-base"
                  required
                  data-testid="input-url-hero"
                />
                <Button type="submit" size="lg" className="h-12 px-8" data-testid="button-check-hero">
                  Check Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-4 animate-slide-up animate-stagger-3">
                No signup required. Results in ~30 seconds.
              </p>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="bg-muted/30 border-y border-border py-20">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Three steps to uncover what search engines actually see
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <FileCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">1. Fetch Raw HTML</h3>
                  <p className="text-muted-foreground">
                    We request your page and capture the initial HTML response — exactly what a crawler sees first.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">2. Render with JavaScript</h3>
                  <p className="text-muted-foreground">
                    We run your JavaScript in a real browser environment and wait for the DOM to settle.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">3. Compare & Report</h3>
                  <p className="text-muted-foreground">
                    We diff the raw and rendered versions, flagging critical SEO elements that changed or disappeared.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What We Detect */}
          <section id="features" className="py-20">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">What We Detect</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Comprehensive checks for JavaScript rendering issues
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {[
                  { icon: CheckCircle2, title: 'Title & Meta Tags', desc: 'Verify title, description, canonical, and robots meta are present in raw HTML' },
                  { icon: AlertTriangle, title: 'Missing Content', desc: 'Detect headings, links, and text that only appear after JavaScript runs' },
                  { icon: Code2, title: 'Structured Data', desc: 'Check if JSON-LD schema is in raw HTML or added client-side' },
                  { icon: FileCode, title: 'JavaScript Errors', desc: 'Surface runtime errors that might prevent rendering' },
                  { icon: Globe, title: 'Redirect Chains', desc: 'Track HTTP redirects and identify unnecessary hops' },
                  { icon: Search, title: 'Internal Links', desc: 'Compare link counts before and after rendering' },
                ].map((item, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-6">
                    <item.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Example Preview */}
          <section className="bg-muted/30 border-y border-border py-20">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">See It In Action</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Clear, actionable insights with severity levels
                </p>
              </div>

              <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">example.com</div>
                      <div className="text-2xl font-bold">SEO Risk: MEDIUM</div>
                    </div>
                    <div className="text-3xl font-bold text-primary">68/100</div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-destructive mb-1">Title missing in raw HTML</div>
                      <div className="text-sm text-muted-foreground">
                        Critical: Title only appears after JavaScript renders
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">H1 count changed</div>
                      <div className="text-sm text-muted-foreground">
                        Raw: 0 headings → Rendered: 1 heading
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-primary mb-1">Canonical tag present</div>
                      <div className="text-sm text-muted-foreground">
                        Found in raw HTML with correct URL
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <Link href="/tools/javascript-seo-checker">
                  <Button size="lg" data-testid="button-try-tool">
                    Try It Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </>
  );
}
