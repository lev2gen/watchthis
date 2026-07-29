import { Link } from 'wouter';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Seo
        title="404 - Page Not Found"
        description="The page you're looking for doesn't exist."
        path="/404"
      />
      <div className="min-h-[100dvh] flex flex-col">
        <Header />

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl font-bold text-primary mb-4">404</div>
            <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
            <p className="text-lg text-muted-foreground mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button size="lg" data-testid="button-home">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
              <Link href="/tools/javascript-seo-checker">
                <Button size="lg" variant="outline" data-testid="button-tool">
                  <Search className="w-4 h-4 mr-2" />
                  Check a URL
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
