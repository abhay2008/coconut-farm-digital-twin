import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory fallback cache for serverless environments (Vercel/Netlify)
let memoryCache: Record<string, unknown> | null = null;

export async function GET() {
  try {
    if (memoryCache) {
      return NextResponse.json(memoryCache);
    }
    const publicPath = path.join(process.cwd(), 'public', 'farm_data.json');
    if (fs.existsSync(publicPath)) {
      const data = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { farmData, customComponents } = body;

    if (!farmData) {
      return NextResponse.json({ success: false, error: 'No farmData provided' }, { status: 400 });
    }

    const updatedData = {
      ...farmData,
      customComponents: customComponents || []
    };

    memoryCache = updatedData;
    const jsonString = JSON.stringify(updatedData, null, 2);

    try {
      const publicPath = path.join(process.cwd(), 'public', 'farm_data.json');
      fs.writeFileSync(publicPath, jsonString);
      
      const fixturesPath = path.join(process.cwd(), '..', '..', 'fixtures', 'farm_data.json');
      if (fs.existsSync(path.dirname(fixturesPath))) {
        fs.writeFileSync(fixturesPath, jsonString);
      }
    } catch (fsErr) {
      console.warn('fs.writeFileSync skipped in serverless environment, using memoryCache:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Farm layout saved successfully!',
      treeCount: farmData.trees.length,
      componentCount: (customComponents || []).length
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving farm data:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
