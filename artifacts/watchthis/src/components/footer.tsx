import { Link } from 'wouter';
import { LogoMark } from './logo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <LogoMark className="w-7 h-7 text-primary" />
              <span className="font-bold text-lg">WatchThis</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Compare raw HTML with rendered DOM. Catch JavaScript SEO issues before they affect indexing.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/tools/javascript-seo-checker" className="text-muted-foreground hover:text-foreground transition-colors">
                  SEO Checker Tool
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} WatchThis. A free developer tool for JavaScript SEO.</p>
        </div>
      </div>
    </footer>
  );
}
