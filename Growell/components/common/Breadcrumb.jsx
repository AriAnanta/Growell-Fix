'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center space-x-1.5 text-xs mb-4">
      <Link href="/kader" className="flex items-center text-gray-400 hover:text-gray-600 transition-colors">
        <Home size={14} />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-gray-300" />
          {index === items.length - 1 ? (
            <span className="text-gray-600 font-medium">{item.label}</span>
          ) : (
            <Link href={item.path} className="text-gray-400 hover:text-gray-600 transition-colors">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
