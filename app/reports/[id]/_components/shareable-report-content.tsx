'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Share2,
  Download,
  Twitter,
  Linkedin,
  Link2,
  Check,
  FileText,
  ArrowLeft,
  Loader2,
  Facebook,
  Rss,
} from 'lucide-react';
import Link from 'next/link';
import { MarkdownRenderer } from '@/components/dashboard/markdown-renderer';

interface OutputData {
  id: string;
  agentName: string;
  agentEmoji: string;
  agentRole: string;
  agentColor: string;
  taskName: string;
  content: string;
  summary: string | null;
  createdAt: string;
}

export default function ShareableReportContent({ output }: { output: OutputData }) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? window.location.href 
    : '';
  
  const shareTitle = `${output.agentEmoji} ${output.taskName} by ${output.agentName}`;
  const shareText = output.summary || `Check out this intelligence report from Mission Control`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle)}`;
    window.open(url, '_blank');
  };

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId: output.id }),
      });
      
      const data = await response.json();
      
      if (data.success && data.pdfUrl) {
        const link = document.createElement('a');
        link.href = data.pdfUrl;
        link.download = data.fileName;
        link.click();
      } else {
        alert('Failed to generate PDF: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/outputs"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            
            <button
              onClick={shareToFacebook}
              className="p-2 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/30 transition-colors"
              title="Share on Facebook"
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" />
            </button>
            
            <button
              onClick={shareToTwitter}
              className="p-2 rounded-lg bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 transition-colors"
              title="Share on X (Twitter)"
            >
              <Twitter className="w-4 h-4 text-[#1DA1F2]" />
            </button>
            
            <button
              onClick={shareToLinkedIn}
              className="p-2 rounded-lg bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 transition-colors"
              title="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            </button>
            
            <Link
              href="/api/feeds/all.xml"
              target="_blank"
              className="p-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 transition-colors"
              title="RSS Feed"
            >
              <Rss className="w-4 h-4 text-orange-500" />
            </Link>
            
            <button
              onClick={downloadPdf}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all text-sm font-medium disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#1e1e32]/80 rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
        >
          {/* Report Header */}
          <div 
            className="p-8 md:p-12"
            style={{ background: `linear-gradient(135deg, ${output.agentColor}30, ${output.agentColor}10)` }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
              <div 
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl"
                style={{ background: `linear-gradient(135deg, ${output.agentColor}, ${output.agentColor}80)` }}
              >
                {output.agentEmoji}
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2">{output.taskName}</h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-300">
                  <span className="font-semibold" style={{ color: output.agentColor }}>
                    {output.agentName}
                  </span>
                  <span className="text-gray-500">&bull;</span>
                  <span className="text-sm">{output.agentRole}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{format(new Date(output.createdAt), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                <span>{format(new Date(output.createdAt), 'HH:mm:ss')} UTC</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {output.summary && (
            <div className="mx-8 md:mx-12 my-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                Executive Summary
              </h3>
              <p className="text-gray-200 leading-relaxed">{output.summary}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-12 pt-2">
            <MarkdownRenderer content={output.content} />
          </div>

          {/* Footer */}
          <div className="px-8 md:px-12 py-6 bg-black/20 border-t border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌹</span>
                <div>
                  <div className="font-semibold">Mission Control</div>
                  <div className="text-xs text-gray-500">Powered by Abacus AI</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share Report
                </button>
                <button
                  onClick={downloadPdf}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </motion.article>
      </main>
    </div>
  );
}
