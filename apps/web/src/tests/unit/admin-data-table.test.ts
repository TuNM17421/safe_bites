import { describe, expect, it } from 'vitest';
import { AdminDataTable } from '../../components/admin/admin-data-table';

// Compile/import smoke test: verifies the module builds and its lucide-react icon imports
// resolve. Full DOM rendering is covered by the phase-13 Playwright admin flow.
describe('AdminDataTable', () => {
  it('is a component (module compiles; lucide imports resolve)', () => {
    expect(typeof AdminDataTable).toBe('function');
  });
});
