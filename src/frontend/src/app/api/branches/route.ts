import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory branch storage for serverless environments (Vercel)
interface BranchRecord {
  name: string;
  is_main: boolean;
  farmData: Record<string, unknown>;
  customComponents: Array<Record<string, unknown>>;
  updated_at: string;
}

const memoryBranchStore: Record<string, BranchRecord> = {};

// Helper to get initial factory default ground truth data from disk
function getFactoryDefaultData(): { farmData: Record<string, unknown>; customComponents: Array<Record<string, unknown>> } | null {
  try {
    const publicPath = path.join(process.cwd(), 'public', 'farm_data.json');
    if (fs.existsSync(publicPath)) {
      const raw = fs.readFileSync(publicPath, 'utf8');
      const parsed = JSON.parse(raw);
      const customComponents = parsed.customComponents || [];
      return { farmData: parsed, customComponents };
    }
  } catch (e) {
    console.error('Error reading factory default farm_data.json:', e);
  }
  return null;
}

// Ensure main branch is initialized
function ensureMainBranch(): BranchRecord {
  if (!memoryBranchStore['main']) {
    const defaultData = getFactoryDefaultData();
    memoryBranchStore['main'] = {
      name: 'main',
      is_main: true,
      farmData: defaultData?.farmData || { trees: [] },
      customComponents: defaultData?.customComponents || [],
      updated_at: new Date().toISOString()
    };
  }
  return memoryBranchStore['main'];
}

// GET: List all branches or fetch a specific branch
export async function GET(request: Request) {
  try {
    ensureMainBranch();
    const { searchParams } = new URL(request.url);
    const branchName = searchParams.get('name');

    // Fetch specific branch by name
    if (branchName) {
      const key = branchName.toLowerCase().trim();
      const record = memoryBranchStore[key];
      if (record) {
        return NextResponse.json({
          success: true,
          branch: {
            name: record.name,
            is_main: record.is_main,
            farmData: record.farmData,
            customComponents: record.customComponents,
            updated_at: record.updated_at
          }
        });
      }

      // If requested branch is main but not in memory yet, serve factory default
      if (key === 'main') {
        const mainRec = ensureMainBranch();
        return NextResponse.json({
          success: true,
          branch: {
            name: mainRec.name,
            is_main: true,
            farmData: mainRec.farmData,
            customComponents: mainRec.customComponents,
            updated_at: mainRec.updated_at
          }
        });
      }

      return NextResponse.json({ success: false, error: `Branch '${branchName}' not found` }, { status: 404 });
    }

    // List all branch summaries
    const summaries = Object.values(memoryBranchStore).map((b) => {
      const trees = Array.isArray((b.farmData as { trees?: unknown[] })?.trees)
        ? (b.farmData as { trees: unknown[] }).trees.length
        : 0;
      return {
        name: b.name,
        is_main: b.is_main,
        treeCount: trees,
        componentCount: b.customComponents.length,
        updated_at: b.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      branches: summaries
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST: Save/update a branch
export async function POST(request: Request) {
  try {
    ensureMainBranch();
    const body = await request.json();
    const { name, farmData, customComponents, password } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Branch name is required' }, { status: 400 });
    }

    if (!farmData) {
      return NextResponse.json({ success: false, error: 'farmData is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const isMain = cleanName.toLowerCase() === 'main';

    // Password validation for Main branch
    if (isMain) {
      if (password !== '666') {
        return NextResponse.json({
          success: false,
          error: '🔒 Password "666" is required to save to Main branch!'
        }, { status: 401 });
      }
    }

    const recordKey = cleanName.toLowerCase();
    const newRecord: BranchRecord = {
      name: isMain ? 'main' : cleanName,
      is_main: isMain,
      farmData,
      customComponents: customComponents || [],
      updated_at: new Date().toISOString()
    };

    memoryBranchStore[recordKey] = newRecord;

    // If main, attempt to persist to disk in local development
    if (isMain) {
      try {
        const publicPath = path.join(process.cwd(), 'public', 'farm_data.json');
        const jsonContent = JSON.stringify({ ...farmData, customComponents: customComponents || [] }, null, 2);
        fs.writeFileSync(publicPath, jsonContent);
      } catch (fsErr) {
        console.warn('Skipped disk write for serverless main save:', fsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: isMain ? '✅ Main branch updated successfully!' : `✅ Branch '${cleanName}' saved successfully!`,
      branch: {
        name: newRecord.name,
        is_main: newRecord.is_main,
        treeCount: Array.isArray((farmData as { trees?: unknown[] })?.trees) ? (farmData as { trees: unknown[] }).trees.length : 0,
        componentCount: (customComponents || []).length,
        updated_at: newRecord.updated_at
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE: Delete a branch (Password 666 required for main to reset to default)
export async function DELETE(request: Request) {
  try {
    ensureMainBranch();
    const body = await request.json();
    const { name, password } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Branch name is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const recordKey = cleanName.toLowerCase();
    const isMain = recordKey === 'main';

    if (isMain) {
      if (password !== '666') {
        return NextResponse.json({
          success: false,
          error: '🔒 Password "666" is required to delete/reset the Main branch!'
        }, { status: 401 });
      }

      // Reset main branch to factory default
      const defaultData = getFactoryDefaultData();
      memoryBranchStore['main'] = {
        name: 'main',
        is_main: true,
        farmData: defaultData?.farmData || { trees: [] },
        customComponents: defaultData?.customComponents || [],
        updated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        message: '🔄 Main branch has been reset to factory ground-truth default!'
      });
    }

    if (!memoryBranchStore[recordKey]) {
      return NextResponse.json({ success: false, error: `Branch '${cleanName}' does not exist` }, { status: 404 });
    }

    delete memoryBranchStore[recordKey];

    return NextResponse.json({
      success: true,
      message: `🗑️ Branch '${cleanName}' deleted successfully!`
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
