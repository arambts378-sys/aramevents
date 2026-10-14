'use client';

import React from 'react';
import Link from 'next/link';

export function GiftingCatalogueSection() {
  return (
    <section className="py-20 bg-[#FDF8FF] border-t border-[#EDE9FE]" id="gifting">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 flex flex-col items-start gap-6">
        {/* Header Label */}
        <span className="text-xs sm:text-sm font-bold text-[#8B2886] uppercase tracking-widest">
          DIWALI GIFTING CATALOGUE
        </span>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#2D124D] tracking-tight leading-[1.18]">
          Thoughtful Gifts for Meaningful Business Relationships
        </h2>

        {/* Description Paragraphs */}
        <div className="flex flex-col gap-4 text-sm sm:text-base text-[#554E63] leading-relaxed font-normal">
          <p>
            Explore our curated corporate gifting catalogue featuring handcrafted, sustainable, and culturally inspired products from Kottravai. From employee appreciation and festive gifting to client relationships and bulk corporate orders, our collection offers thoughtful gifting options for every occasion.
          </p>
          <p>
            Choose from ready-to-order products or work with our team to create a customised gifting solution based on your budget, quantity, occasion, and branding requirements.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-4 w-full sm:w-auto">
          {/* Download Catalogue Button */}
          <a
            href="/kottravai-festive%20gifting.pdf"
            download="Kottravai-Festive-Gifting-Catalogue.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-[#8B2886] hover:bg-[#772073] text-white px-7 py-4 rounded-2xl text-sm sm:text-base font-bold shadow-md shadow-[#8B2886]/20 transition-all duration-200 active:scale-[0.98] w-full sm:w-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">description</span>
            <span>Download Diwali Gifting Catalogue</span>
          </a>

          {/* Request Custom Quote Button */}
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-[#2D124D] border border-gray-200/80 px-7 py-4 rounded-2xl text-sm sm:text-base font-bold shadow-xs transition-all duration-200 active:scale-[0.98] w-full sm:w-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">chat_bubble_outline</span>
            <span>Request a Custom Quote</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
