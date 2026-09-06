import Link from 'next/link';
import { ArrowLeft, Clock, BookOpen } from 'lucide-react';
import { findArticle, KB } from '@/lib/kb';
import { notFound } from 'next/navigation';

// Server component — renders the article. The KB is small enough to
// statically resolve.
export function generateStaticParams() {
  return KB.map((a) => ({ slug: a.slug }));
}

export default async function Article({ params }) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();
  const related = KB.filter((a) => a.category === article.category && a.slug !== article.slug).slice(0, 4);
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/dashboard/help" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-6" data-testid="article-back">
        <ArrowLeft className="w-4 h-4" /> Help Center
      </Link>
      <div className="text-xs uppercase tracking-widest text-white/40 mb-2">{article.category.replace('-', ' ')}</div>
      <h1 className="text-3xl font-semibold" data-testid="article-title">{article.title}</h1>
      <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {article.read} min read</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> slug: {article.slug}</span>
      </div>

      <article className="mt-6 prose prose-invert max-w-none">
        <SimpleMarkdown text={article.body} />
      </article>

      {related.length > 0 && (
        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Related articles</div>
          <div className="space-y-1">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/dashboard/help/${r.slug}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
              >
                <div className="w-1 h-1 rounded-full bg-sky-400" />
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Ultra-safe markdown-lite (no dangerouslySetInnerHTML): headings, bold, code, lists.
function SimpleMarkdown({ text }) {
  const blocks = text.split(/\n\n+/);
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith('# ')) return <h1 key={i} className="text-2xl font-semibold mt-6">{block.slice(2)}</h1>;
        if (block.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mt-6">{block.slice(3)}</h2>;
        if (/^\d+\./.test(block.split('\n')[0])) {
          return (
            <ol key={i} className="list-decimal ml-5 space-y-1 text-white/80">
              {block.split('\n').map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^\d+\.\s?/, ''))}</li>
              ))}
            </ol>
          );
        }
        if (block.startsWith('- ')) {
          return (
            <ul key={i} className="list-disc ml-5 space-y-1 text-white/80">
              {block.split('\n').map((line, j) => (
                <li key={j}>{renderInline(line.replace(/^-\s?/, ''))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i} className="text-white/80 leading-relaxed">{renderInline(block)}</p>;
      })}
    </>
  );
}
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <b key={i}>{p.slice(2, -2)}</b>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-white/10 rounded px-1 text-[12px] font-mono">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={i} href={link[2]} className="accent-text underline">{link[1]}</a>;
    return <span key={i}>{p}</span>;
  });
}
