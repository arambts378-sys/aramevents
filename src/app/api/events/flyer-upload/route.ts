import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to upload files.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided for upload.' },
        { status: 400 }
      );
    }

    // 5MB limit check
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Flyer file size exceeds 5MB limit. Please choose a smaller file.' },
        { status: 400 }
      );
    }

    // Accept standard image types and PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|gif|pdf)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a JPG, PNG, WEBP, or PDF.' },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const storedFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `website_flyers/${storedFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const adminSupabase = createAdminClient();

    const { error: uploadError } = await adminSupabase.storage
      .from('event-flyers')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Server flyer upload failed:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = adminSupabase.storage
      .from('event-flyers')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
    });
  } catch (err: any) {
    console.error('Flyer upload route exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Unexpected error during flyer upload' },
      { status: 500 }
    );
  }
}
