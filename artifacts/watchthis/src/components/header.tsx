import { Link } from 'wouter';
import { Sun, Moon } from 'lucide-react';
import { LogoMark } from './logo';
import { SiGithub } from 'react-icons/si';
import { useTheme } from './theme-provider';
import { Button } from '@/components/ui/button';
import { useContent } from '@/content/content-context';
import { settingsDefaults } from '@/content/defaults/settings';

export function Header() {
  const { theme, setTheme } = useTheme();
  const settings = useContent('settings', settingsDefaults);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <LogoMark className="w-7 h-7 text-primary" />
          <span className="font-bold text-lg">WatchThis</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium flex-1">
          <Link href="/tools/javascript-seo-checker" className="text-muted-foreground hover:text-foreground transition-colors">
            Tool
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            data-testid="link-github"
          >
            <a
              href={settings.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
            >
              <SiGithub className="w-5 h-5" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </nav>
    </header>
  );
}
