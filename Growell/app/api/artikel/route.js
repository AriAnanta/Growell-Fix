import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

// Inisialisasi parser
const parser = new Parser({
  customFields: {
    item: ['description', 'source'],
  }
});

// Cache revalidation time (cache hasil request selama 1 jam / 3600 detik)
export const revalidate = 3600;

export async function GET() {
  try {
    // Kita ngambil RSS dari Google News bahasa Indonesia tentang stunting anak
    const feedUrl = 'https://news.google.com/rss/search?q=stunting+gizi+anak+indonesia&hl=id&gl=ID&ceid=ID:id';
    const feed = await parser.parseURL(feedUrl);

    // Ambil 10 artikel terbaru
    const articles = feed.items.slice(0, 10).map((item) => {
      // Google News biasanya nyelipin source di title "Judul Berita - Nama Media"
      // Kita coba pisahin
      let title = item.title || '';
      let source = item.source || 'Berita Kesehatan';
      
      const titleParts = title.split(' - ');
      if (titleParts.length > 1) {
        source = titleParts.pop(); // Ambil bagian terakhir sebagai source
        title = titleParts.join(' - '); // Sisa judul
      }

      // Bersihkan deskripsi dari tag HTML kalo ada
      let desc = item.description || title;
      desc = desc.replace(/<[^>]*>?/gm, ''); // Hapus HTML
      if (desc.length > 150) {
        desc = desc.substring(0, 150) + '...';
      }

      return {
        source: source.trim(),
        title: title.trim(),
        desc: desc,
        url: item.link || '#',
        publishedAt: item.pubDate || new Date().toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Error fetching RSS:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil berita terbaru' },
      { status: 500 }
    );
  }
}
