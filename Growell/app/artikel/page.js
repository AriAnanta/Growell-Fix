'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import AppNavbar from '@/components/common/AppNavbar';
import { isAuthenticated, getUserData } from '@/utils/auth';

export default function ArtikelPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      setUserData(getUserData());
    }
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/artikel');
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mesh-bg relative">
      <AppNavbar maxWidth="max-w-5xl">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
            <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Growell</span>
        </Link>
      </AppNavbar>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        
        <div className="mb-8 flex items-center gap-4 section-appear">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Kumpulan <span className="gradient-text-static">Artikel</span> 📚
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Berbagai berita dan informasi terbaru seputar gizi dan tumbuh kembang anak.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-teal-500 animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-grid section-appear section-appear-delay-1">
            {articles.map((article, i) => (
              <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col justify-between bg-white border border-gray-100 rounded-2xl p-6 hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1.5 rounded-md">{article.source}</span>
                    <ExternalLink size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base mb-3 group-hover:text-teal-700 transition-colors leading-snug">{article.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">{article.desc}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
