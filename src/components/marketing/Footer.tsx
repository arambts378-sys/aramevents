'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#C9C4D8]/30 select-none">
      <div className="w-full py-10 px-6 lg:px-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand & Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <Link
            href="/"
            className="font-space text-[18px] font-bold text-[#1B192F] tracking-tight hover:text-[#5F3ADD] transition-colors"
          >
            ARAM BTS
          </Link>
          <span className="hidden sm:inline text-[#C9C4D8]">|</span>
          <span className="font-jakarta text-[12px] text-[#484555]">
            © 2026 ARAM BTS (WisRight Technologies). All rights reserved.
          </span>
        </div>

        {/* Links Cluster */}
        <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 font-jakarta">
          <a
            className="text-[12px] text-[#1B192F] font-semibold hover:text-[#5F3ADD] transition-colors duration-150 hover:underline"
            href="#platform"
          >
            Platform
          </a>
          <a
            className="text-[12px] text-[#484555] hover:text-[#1B192F] hover:text-[#5F3ADD] transition-colors duration-150 hover:underline"
            href="#solutions"
          >
            Solutions
          </a>
          <a
            className="text-[12px] text-[#484555] hover:text-[#1B192F] hover:text-[#5F3ADD] transition-colors duration-150 hover:underline"
            href="#resources"
          >
            Resources
          </a>
          <Link
            className="text-[12px] text-[#484555] hover:text-[#1B192F] hover:text-[#5F3ADD] transition-colors duration-150 hover:underline"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="text-[12px] text-[#484555] hover:text-[#1B192F] hover:text-[#5F3ADD] transition-colors duration-150 hover:underline"
            href="/terms"
          >
            Terms of Service
          </Link>
          <span className="text-[12px] text-[#484555] hover:text-[#1B192F] hover:text-[#5F3ADD] transition-colors duration-150">
            Security Architecture
          </span>
        </nav>
      </div>
    </footer>
  );
}
