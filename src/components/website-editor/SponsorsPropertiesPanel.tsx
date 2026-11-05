import React from 'react';

export default function SponsorsPropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Section Heading</label>
          <input 
            type="text" 
            value={content.heading || ''} 
            placeholder="Sponsors"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
          <input 
            type="text" 
            value={content.title || ''} 
            placeholder="Supported by industry leaders."
            onChange={(e) => updateSection({ title: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>
        
        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Sponsor Tiers</span>
          <input 
            type="checkbox" 
            checked={content.showTiers ?? true}
            onChange={(e) => updateSection({ showTiers: e.target.checked })}
            className="w-4 h-4"
          />
        </label>
      </div>

      <div className="p-3 bg-ds-accent-soft border border-ds-line rounded text-ds-ink">
        <p className="text-xs">
          Add names on the event&apos;s Sponsors &amp; Partners page. Amounts are never shown here or on your website.
        </p>
      </div>
    </div>
  );
}
