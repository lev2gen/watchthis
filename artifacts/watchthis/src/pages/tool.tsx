import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Seo } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  useRunCheck,
  useGetStats,
  getGetStatsQueryKey,
} from '@workspace/api-client-react';
import type { CheckResult, CheckStats } from '@workspace/api-client-react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
  Search,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Tool() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);

  const runCheck = useRunCheck();
  const { data: stats } = useGetStats();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      setUrl(urlParam);
      handleCheck(urlParam);
    }
  }, []);

  const handleCheck = (urlToCheck?: string) => {
    const targetUrl = urlToCheck || url;
    if (!targetUrl.trim()) return;

    setResult(null);
    runCheck.mutate(
      { data: { url: targetUrl } },
      {
        onSuccess: (data) => {
          setResult(data);
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheck();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'text-destructive';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-500';
      case 'LOW':
        return 'text-green-600 dark:text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <>
      <Seo
        title="JavaScript SEO Checker Tool"
        description="Free tool to compare raw HTML with rendered DOM. Check your site for JavaScript SEO issues in seconds."
        path="/tools/javascript-seo-checker"
      />
      <div className="min-h-[100dvh] flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">JavaScript SEO Checker</h1>
              <p className="text-muted-foreground">
                Compare raw HTML with rendered DOM and discover SEO issues
              </p>
            </div>

            {/* Input Form */}
            <Card className="mb-8">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                    disabled={runCheck.isPending}
                    required
                    data-testid="input-url-tool"
                  />
                  <Button
                    type="submit"
                    disabled={runCheck.isPending}
                    data-testid="button-check-tool"
                  >
                    {runCheck.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Check
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Loading State */}
            {runCheck.isPending && (
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="font-medium">Running check...</span>
                    </div>
                    <Progress value={undefined} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      This usually takes 20-30 seconds. We're fetching raw HTML, rendering JavaScript, and comparing the results.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {runCheck.isError && (
              <Card className="mb-8 border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <div className="font-semibold text-destructive mb-1">Check Failed</div>
                      <div className="text-sm text-muted-foreground">
                        {(runCheck.error as any)?.data?.error || 'An error occurred while checking the URL'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-6">
                {/* Risk Summary */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="mb-2">
                          <a
                            href={result.finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-2"
                          >
                            {result.url}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          Checked {format(new Date(result.checkedAt), 'PPpp')} • Rendered in {result.renderMs}ms
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getRiskColor(result.riskLevel)}`}>
                          {result.riskScore}/100
                        </div>
                        <div className={`text-sm font-semibold ${getRiskColor(result.riskLevel)}`}>
                          Risk: {result.riskLevel}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">HTTP Status</div>
                        <div className="font-semibold">{result.httpStatus}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Findings</div>
                        <div className="font-semibold">{result.findings.length}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">JS Errors</div>
                        <div className="font-semibold">{result.jsErrors.length}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Redirects</div>
                        <div className="font-semibold">{result.redirectChain.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Findings */}
                {result.findings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.findings.map((finding) => {
                          const Icon = getSeverityIcon(finding.severity);
                          return (
                            <div
                              key={finding.id}
                              className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border"
                            >
                              <Icon className="w-5 h-5 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{finding.message}</span>
                                  <Badge variant={getSeverityColor(finding.severity)} className="text-xs">
                                    {finding.severity}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {finding.category}
                                </div>
                                {(finding.rawValue !== undefined || finding.renderedValue !== undefined) && (
                                  <div className="mt-2 text-sm font-mono bg-background p-2 rounded border border-border">
                                    {finding.rawValue !== undefined && (
                                      <div>Raw: {finding.rawValue || '(empty)'}</div>
                                    )}
                                    {finding.renderedValue !== undefined && (
                                      <div>Rendered: {finding.renderedValue || '(empty)'}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Raw vs Rendered Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <ComparisonRow label="Title" raw={result.raw.title} rendered={result.rendered.title} />
                      <Separator />
                      <ComparisonRow label="Meta Description" raw={result.raw.metaDescription} rendered={result.rendered.metaDescription} />
                      <Separator />
                      <ComparisonRow label="Canonical" raw={result.raw.canonical} rendered={result.rendered.canonical} />
                      <Separator />
                      <ComparisonRow label="Meta Robots" raw={result.raw.metaRobots} rendered={result.rendered.metaRobots} />
                      <Separator />
                      <ComparisonRow label="H1 Count" raw={result.raw.h1.length.toString()} rendered={result.rendered.h1.length.toString()} />
                      <Separator />
                      <ComparisonRow label="Internal Links" raw={result.raw.internalLinksCount.toString()} rendered={result.rendered.internalLinksCount.toString()} />
                      <Separator />
                      <ComparisonRow label="Word Count" raw={result.raw.wordCount.toString()} rendered={result.rendered.wordCount.toString()} />
                      <Separator />
                      <ComparisonRow label="Structured Data" raw={result.raw.structuredDataTypes.join(', ') || 'None'} rendered={result.rendered.structuredDataTypes.join(', ') || 'None'} />
                      <Separator />
                      <ComparisonRow label="Images Total" raw={result.raw.imagesTotal.toString()} rendered={result.rendered.imagesTotal.toString()} />
                      <Separator />
                      <ComparisonRow label="Images Without Alt" raw={result.raw.imagesWithoutAlt.toString()} rendered={result.rendered.imagesWithoutAlt.toString()} />
                      <Separator />
                      <ComparisonRow label="HTML Size (bytes)" raw={result.raw.htmlBytes.toString()} rendered={result.rendered.htmlBytes.toString()} />
                    </div>
                  </CardContent>
                </Card>

                {/* JavaScript Errors */}
                {result.jsErrors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>JavaScript Errors ({result.jsErrors.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.jsErrors.map((error, i) => (
                          <div key={i} className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm font-mono">
                            {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Blocked Resources */}
                {result.blockedResources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Blocked Resources ({result.blockedResources.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.blockedResources.map((resource, i) => (
                          <div key={i} className="p-3 bg-muted/30 border border-border rounded text-sm font-mono break-all">
                            {resource}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Redirect Chain */}
                {result.redirectChain.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Redirect Chain ({result.redirectChain.length} hops)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.redirectChain.map((hop, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded">
                            <Badge variant="outline">{hop.status}</Badge>
                            <span className="text-sm font-mono break-all">{hop.url}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Sidebar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Stats */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Platform Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">{stats.totalChecks.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Total Checks Run</div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-500">{stats.lowCount}</div>
                          <div className="text-xs text-muted-foreground">Low Risk</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-500">{stats.mediumCount}</div>
                          <div className="text-xs text-muted-foreground">Medium</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-destructive">{stats.highCount}</div>
                          <div className="text-xs text-muted-foreground">High Risk</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

function ComparisonRow({ label, raw, rendered }: { label: string; raw: string | null; rendered: string | null }) {
  const isDifferent = raw !== rendered;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="font-semibold">{label}</div>
      <div className="font-mono text-sm break-words">
        <div className="text-muted-foreground mb-1">Raw</div>
        <div className={isDifferent ? 'text-yellow-600 dark:text-yellow-500' : ''}>
          {raw || <span className="text-muted-foreground italic">(empty)</span>}
        </div>
      </div>
      <div className="font-mono text-sm break-words">
        <div className="text-muted-foreground mb-1">Rendered</div>
        <div className={isDifferent ? 'text-primary' : ''}>
          {rendered || <span className="text-muted-foreground italic">(empty)</span>}
        </div>
      </div>
    </div>
  );
}
