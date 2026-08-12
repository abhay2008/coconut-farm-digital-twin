import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabaseClient';

interface BranchRecord {
  name: string;
  is_main: boolean;
  farmData: Record<string, unknown>;
  customComponents: Array<Record<string, unknown>>;
  updated_at: string;
}

// In-memory fallback branch store
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

// Ensure main branch exists in memory
function ensureMainMemoryBranch(): BranchRecord {
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

// GET: Fetch list of branches or a specific branch by name
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchName = searchParams.get('name');

    // 1. If Supabase Cloud DB is configured
    if (isSupabaseConfigured() && supabase) {
      if (branchName) {
        const clean = branchName.trim().toLowerCase();
        const { data, error } = await supabase
          .from('farm_branches')
          .select('*')
          .ilike('name', clean)
          .single();

        if (data && !error) {
          return NextResponse.json({
            success: true,
            branch: {
              name: data.name,
              is_main: data.is_main,
              farmData: data.farm_data,
              customComponents: data.custom_components || [],
              updated_at: data.updated_at
            }
          });
        }
      } else {
        const { data, error } = await supabase
          .from('farm_branches')
          .select('name, is_main, farm_data, custom_components, updated_at')
          .order('is_main', { ascending: false });

        if (data && !error && data.length > 0) {
          const summaries = data.map((b) => ({
            name: b.name,
            is_main: b.is_main,
            treeCount: Array.isArray(b.farm_data?.trees) ? b.farm_data.trees.length : 0,
            componentCount: Array.isArray(b.custom_components) ? b.custom_components.length : 0,
            updated_at: b.updated_at
          }));
          return NextResponse.json({ success: true, branches: summaries });
        }
      }
    }

    // 2. Fallback to Server Memory / Local Disk
    ensureMainMemoryBranch();

    if (branchName) {
      const key = branchName.toLowerCase().trim();
      const record = memoryBranchStore[key] || (key === 'main' ? ensureMainMemoryBranch() : null);
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
      return NextResponse.json({ success: false, error: `Branch '${branchName}' not found` }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, branches: summaries });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST: Save or update a branch
export async function POST(request: Request) {
  try {
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
    if (isMain && password !== '666') {
      return NextResponse.json({
        success: false,
        error: '🔒 Incorrect security password for Main branch!'
      }, { status: 401 });
    }

    const now = new Date().toISOString();
    const finalName = isMain ? 'main' : cleanName;

    // 1. Try Supabase Cloud DB first if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('farm_branches')
          .upsert({
            name: finalName,
            is_main: isMain,
            farm_data: farmData,
            custom_components: customComponents || [],
            updated_at: now
          }, { onConflict: 'name' });

        if (error) {
          console.warn('Supabase upsert warning:', error.message);
        }
      } catch (sbErr) {
        console.warn('Supabase DB save error:', sbErr);
      }
    }

    // 2. Also update server memory store
    const recordKey = finalName.toLowerCase();
    memoryBranchStore[recordKey] = {
      name: finalName,
      is_main: isMain,
      farmData,
      customComponents: customComponents || [],
      updated_at: now
    };

    // 3. If main branch, persist to local disk in dev environment
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
      message: isMain ? '✅ Main branch updated successfully!' : `✅ Branch '${finalName}' saved successfully!`,
      branch: {
        name: finalName,
        is_main: isMain,
        treeCount: Array.isArray((farmData as { trees?: unknown[] })?.trees) ? (farmData as { trees: unknown[] }).trees.length : 0,
        componentCount: (customComponents || []).length,
        updated_at: now
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE: Delete a branch (or reset main)
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { name, password } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Branch name is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const recordKey = cleanName.toLowerCase();
    const isMain = recordKey === 'main';

    if (isMain && password !== '666') {
      return NextResponse.json({
        success: false,
        error: '🔒 Incorrect security password for Main branch reset!'
      }, { status: 401 });
    }

    // 1. Supabase Cloud DB action
    if (isSupabaseConfigured() && supabase) {
      try {
        if (isMain) {
          const defaultData = getFactoryDefaultData();
          await supabase.from('farm_branches').upsert({
            name: 'main',
            is_main: true,
            farm_data: defaultData?.farmData || { trees: [] },
            custom_components: defaultData?.customComponents || [],
            updated_at: new Date().toISOString()
          }, { onConflict: 'name' });
        } else {
          await supabase.from('farm_branches').delete().eq('name', cleanName);
        }
      } catch (sbErr) {
        console.warn('Supabase DB delete error:', sbErr);
      }
    }

    // 2. Server memory action
    if (isMain) {
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
