import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-4">
      <Link
        to="/kader"
        className="flex items-center text-gray-500 hover:text-cyan-600 transition"
      >
        <Home size={16} />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={16} className="text-gray-400" />
          {index === items.length - 1 ? (
            <span className="text-gray-900 font-semibold">{item.label}</span>
          ) : (
            <Link
              to={item.path}
              className="text-gray-500 hover:text-cyan-600 transition"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

