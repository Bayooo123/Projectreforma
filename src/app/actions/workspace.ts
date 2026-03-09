'use server';

import { getCurrentUserWithWorkspace } from '@/lib/workspace';

/**
 * Server Action to get the current user with workspace details.
 * This safely wraps the lib function for use in Client Components.
 */
export async function getCurrentUserWithWorkspaceAction() {
  try {
    const data = await getCurrentUserWithWorkspace();
    return { success: true, data };
  } catch (error) {
    console.error('Action failed: getCurrentUserWithWorkspaceAction', error);
    return { success: false, error: 'Failed to fetch workspace data' };
  }
}
