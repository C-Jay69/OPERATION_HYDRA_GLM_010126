'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, Shield, AlertCircle, CheckCircle, Download, RefreshCw, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

// Types
interface RedFlag {
  id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  location: string;
  score: number;
  source: string;
  recommendation?: string;
}

interface AnalysisResult {
  id: string;
  documentName: string;
  analyzedAt: string;
  totalFlags: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallRiskScore: number;
  flags: RedFlag[];
  processingTimeSeconds: number;
}

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'jurisdiction', 'financial', 'legal', 'operational', 'compliance',
    'vague_language', 'missing_info', 'liability', 'intellectual_property',
    'tax', 'employee', 'customer', 'other'
  ];

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please drop a valid PDF file');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const analyzeDocument = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/diligence/analyze', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 8) return { label: 'EXTREME RISK', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (score >= 6) return { label: 'HIGH RISK', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (score >= 4) return { label: 'MODERATE RISK', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    if (score >= 2) return { label: 'LOW RISK', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    return { label: 'MINIMAL RISK', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'HIGH':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'LOW':
        return <Shield className="h-5 w-5 text-blue-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 hover:bg-red-200',
      HIGH: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredFlags = result?.flags.filter(flag => {
    const matchesSearch = !searchQuery ||
      flag.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || flag.severity === selectedSeverity;
    const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory;
    return matchesSearch && matchesSeverity && matchesCategory;
  }) || [];

  const resetAnalysis = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setSearchQuery('');
    setSelectedSeverity('all');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              M&A Due Diligence Analyzer
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            AI-powered contract analysis for mergers and acquisitions. Identify red flags, assess risks, and make informed decisions.
          </p>
        </div>

        {!result && (
          <Card className="mb-8 shadow-lg border-2">
            <CardHeader>
              <CardTitle>Upload Contract Document</CardTitle>
              <CardDescription>
                Upload your M&A contract PDF for automated red flag detection and risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                {selectedFile ? (
                  <div>
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Drop PDF file here or click to browse
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Supports PDF files up to 50MB
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {analyzing && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Analyzing document...
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>
                      {progress < 30 && 'Extracting text from PDF...'}
                      {progress >= 30 && progress < 60 && 'Running rule-based analysis...'}
                      {progress >= 60 && progress < 90 && 'Performing AI-powered analysis...'}
                      {progress >= 90 && 'Aggregating results...'}
                    </span>
                  </div>
                </div>
              )}

              {!analyzing && (
                <Button
                  onClick={analyzeDocument}
                  disabled={!selectedFile}
                  className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {selectedFile ? 'Analyze Document' : 'Select a PDF to Analyze'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            {/* Results Header */}
            <Card className="shadow-lg border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Analysis Results</CardTitle>
                    <CardDescription className="text-base">
                      {result.documentName} • Analyzed in {result.processingTimeSeconds}s
                    </CardDescription>
                  </div>
                  <Button onClick={resetAnalysis} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Analyze Another
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Risk Score Overview */}
            <Card className={`shadow-lg border-2 ${getRiskLevel(result.overallRiskScore).border}`}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Overall Risk Assessment</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Based on {result.totalFlags} identified red flags
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-5xl font-bold ${getRiskLevel(result.overallRiskScore).color}`}>
                      {result.overallRiskScore}
                    </div>
                    <div className={`text-lg font-semibold ${getRiskLevel(result.overallRiskScore).color}`}>
                      / 10
                    </div>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${getRiskLevel(result.overallRiskScore).bg} ${getRiskLevel(result.overallRiskScore).color} font-semibold text-lg mb-6`}>
                  {getRiskLevel(result.overallRiskScore).label}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600">{result.criticalCount}</div>
                    <div className="text-sm text-red-700 dark:text-red-400">Critical</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-3xl font-bold text-orange-600">{result.highCount}</div>
                    <div className="text-sm text-orange-700 dark:text-orange-400">High</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-3xl font-bold text-yellow-600">{result.mediumCount}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-400">Medium</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-3xl font-bold text-blue-600">{result.lowCount}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-400">Low</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search flags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Red Flags List */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Identified Red Flags</CardTitle>
                <CardDescription>
                  Showing {filteredFlags.length} of {result.totalFlags} total flags
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredFlags.map((flag, index) => (
                    <Card
                      key={flag.id}
                      className={`border-l-4 ${
                        flag.severity === 'CRITICAL' ? 'border-l-red-500' :
                        flag.severity === 'HIGH' ? 'border-l-orange-500' :
                        flag.severity === 'MEDIUM' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {getSeverityIcon(flag.severity)}
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {flag.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getSeverityBadge(flag.severity)}>
                                  {flag.severity}
                                </Badge>
                                <Badge variant="outline">
                                  {flag.category.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge variant="secondary">
                                  Risk Score: {flag.score}/10
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                            #{index + 1}
                          </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 mb-4">
                          {flag.description}
                        </p>

                        {flag.recommendation && (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              Recommendation:
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              {flag.recommendation}
                            </p>
                          </div>
                        )}

                        {flag.location && (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              CONTRACT CONTEXT:
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                              {flag.location.length > 300 ? flag.location.substring(0, 300) + '...' : flag.location}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {filteredFlags.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No flags match your filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Export Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  const dataStr = JSON.stringify(result, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `diligence-report-${Date.now()}.json`;
                  link.click();
                }}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Download className="h-5 w-5 mr-2" />
                Export Full Report
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-slate-500 dark:text-slate-400 pb-8">
          <p>M&A Due Diligence Analyzer • Powered by Open Source AI Models</p>
        </footer>
      </div>
    </div>
  );
}
