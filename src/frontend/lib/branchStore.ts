import { FarmData, PlacableComponent } from '../types/farm';

export interface BranchSummary {
  name: string;
  is_main: boolean;
  treeCount: number;
  componentCount: number;
  updated_at: string;
}

export interface BranchPayload {
  name: string;
  is_main: boolean;
  farmData: FarmData;
  customComponents: PlacableComponent[];
  updated_at: string;
}

const LOCAL_STORAGE_PREFIX = 'madhu_coco_farm_branch_';
const LOCAL_STORAGE_BRANCH_LIST = 'madhu_coco_farm_branch_list';

// Helper to manage local storage branch listing
function getLocalBranchList(): BranchSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BRANCH_LIST);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse local branch list:', e);
  }
  return [
    {
      name: 'main',
      is_main: true,
      treeCount: 1222,
      componentCount: 0,
      updated_at: new Date().toISOString()
    }
  ];
}

function saveLocalBranchList(list: BranchSummary[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_BRANCH_LIST, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save local branch list:', e);
  }
}

// 1. Fetch List of All Branches
export async function fetchBranchList(): Promise<BranchSummary[]> {
  try {
    const res = await fetch('/api/branches');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.branches)) {
        saveLocalBranchList(data.branches);
        return data.branches;
      }
    }
  } catch (err) {
    console.warn('API branch list fetch failed, falling back to localStorage:', err);
  }
  return getLocalBranchList();
}

// 2. Fetch Full Payload of a Specific Branch
export async function fetchBranchPayload(branchName: string): Promise<BranchPayload | null> {
  const cleanName = branchName.trim();
  
  // Try server API first
  try {
    const res = await fetch(`/api/branches?name=${encodeURIComponent(cleanName)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.branch) {
        // Cache to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${cleanName.toLowerCase()}`, JSON.stringify(data.branch));
        }
        return data.branch;
      }
    }
  } catch (err) {
    console.warn(`API branch payload fetch for '${cleanName}' failed, trying local storage:`, err);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${cleanName.toLowerCase()}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached branch:', e);
      }
    }

    // If main was requested but no cache exists, check legacy saved data
    if (cleanName.toLowerCase() === 'main') {
      const legacy = localStorage.getItem('madhu_coco_farm_saved_data');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed.farmData) {
            return {
              name: 'main',
              is_main: true,
              farmData: parsed.farmData,
              customComponents: parsed.customComponents || [],
              updated_at: new Date().toISOString()
            };
          }
        } catch (e) {
          console.error('Error parsing legacy saved data:', e);
        }
      }
    }
  }

  return null;
}

// 3. Save / Update a Branch (Save as Branch OR Save to Main with password 666)
export async function saveBranch(
  branchName: string,
  farmData: FarmData,
  customComponents: PlacableComponent[],
  password?: string
): Promise<{ success: boolean; message: string }> {
  const cleanName = branchName.trim();
  const isMain = cleanName.toLowerCase() === 'main';

  // Local client check for password 666 if main
  if (isMain && password !== '666') {
    return {
      success: false,
      message: '🔒 Password "666" is required to save to Main branch!'
    };
  }

  const payload = {
    name: isMain ? 'main' : cleanName,
    farmData,
    customComponents,
    password
  };

  // Always update client localStorage immediately for 100% data security
  if (typeof window !== 'undefined') {
    const branchRecord: BranchPayload = {
      name: payload.name,
      is_main: isMain,
      farmData,
      customComponents,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${payload.name.toLowerCase()}`, JSON.stringify(branchRecord));

    // Update branch list in localStorage
    const currentList = getLocalBranchList();
    const existingIdx = currentList.findIndex(b => b.name.toLowerCase() === payload.name.toLowerCase());
    const newSummary: BranchSummary = {
      name: payload.name,
      is_main: isMain,
      treeCount: farmData.trees.length,
      componentCount: customComponents.length,
      updated_at: branchRecord.updated_at
    };

    if (existingIdx >= 0) {
      currentList[existingIdx] = newSummary;
    } else {
      currentList.push(newSummary);
    }
    saveLocalBranchList(currentList);
  }

  // Send request to server API
  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Failed to save branch to server'
      };
    }
    return {
      success: true,
      message: data.message || (isMain ? 'Saved to Main branch!' : `Saved branch '${cleanName}'!`)
    };
  } catch {
    // If API fails, localStorage already succeeded!
    return {
      success: true,
      message: isMain ? 'Saved locally to Main branch!' : `Saved branch '${cleanName}' locally!`
    };
  }
}

// 4. Delete a Branch (Password 666 required for main to reset to default)
export async function deleteBranch(
  branchName: string,
  password?: string
): Promise<{ success: boolean; message: string }> {
  const cleanName = branchName.trim();
  const isMain = cleanName.toLowerCase() === 'main';

  if (isMain && password !== '666') {
    return {
      success: false,
      message: '🔒 Password "666" is required to delete/reset the Main branch!'
    };
  }

  // Remove from localStorage
  if (typeof window !== 'undefined') {
    if (isMain) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}main`);
      localStorage.removeItem('madhu_coco_farm_saved_data');
    } else {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${cleanName.toLowerCase()}`);
      const list = getLocalBranchList().filter(b => b.name.toLowerCase() !== cleanName.toLowerCase());
      saveLocalBranchList(list);
    }
  }

  // Call API
  try {
    const res = await fetch('/api/branches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanName, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || 'Failed to delete branch on server'
      };
    }
    return {
      success: true,
      message: data.message || `Deleted branch '${cleanName}'`
    };
  } catch {
    return {
      success: true,
      message: isMain ? 'Main branch reset locally!' : `Branch '${cleanName}' deleted locally!`
    };
  }
}
