import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function VenuePropertiesPanel({ section, updateSection }: { section: any; updateSection: (updates: any) => void }) {
  const content = section?.content || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // A photo of the venue building, shown beside the map on templates that support it.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${file.name.split('.').pop()}`;
    const supabase = createClient();

    try {
      setUploading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before uploading.');
      const filePath = `${user.id}/website_images/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('event-flyers').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('event-flyers').getPublicUrl(filePath);
      updateSection({ image: data.publicUrl });
    } catch (err) {
      console.error('Error uploading venue photo:', err);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Content</label>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Section Heading</label>
          <input
            type="text"
            value={content.heading || ''}
            placeholder="Venue"
            onChange={(e) => updateSection({ heading: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
          <textarea
            value={content.description || ''}
            placeholder="Experience Aram Events in a state-of-the-art facility designed for collaboration."
            onChange={(e) => updateSection({ description: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white min-h-[80px]"
          />
        </div>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Venue photo</label>
        {content.image ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.image} alt="Venue preview" className="w-full h-32 object-cover bg-gray-200 rounded" />
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-2 py-1.5 text-xs font-semibold text-ds-accent border border-ds-accent rounded hover:bg-ds-accent/10"
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Replace Photo'}
              </button>
              <button
                type="button"
                onClick={() => updateSection({ image: null })}
                className="px-2 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed p-4 rounded text-center bg-white">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold text-ds-accent bg-ds-accent/10 rounded hover:bg-ds-accent/20"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Add Venue Photo'}
            </button>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        <p className="text-xs text-gray-500">A picture of the building. Visitors see it first, with Map and Satellite views beside it.</p>
      </div>

      <div className="space-y-3 p-3 bg-gray-50 border rounded">
        <label className="font-semibold block text-brand-dark border-b pb-2">Presentation</label>

        <label className="flex items-center justify-between text-sm pt-2">
          <span>Show Map</span>
          <input
            type="checkbox"
            checked={content.showMap ?? true}
            onChange={(e) => updateSection({ showMap: e.target.checked })}
            className="w-4 h-4"
          />
        </label>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Map location (optional)</label>
          <input
            type="text"
            value={content.mapQuery || ''}
            placeholder="Full address or Google plus code"
            onChange={(e) => updateSection({ mapQuery: e.target.value })}
            className="w-full border rounded px-2 py-1.5 bg-white"
          />
          <p className="text-xs text-gray-500">Use this if the map pins the wrong place for the venue name.</p>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
        <p className="font-semibold mb-1">Live Data Connected</p>
        <p className="text-xs">
          The venue name and location are automatically pulled from the event configuration.
        </p>
      </div>
    </div>
  );
}
