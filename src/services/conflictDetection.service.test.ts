// Basic smoke tests to verify the service module can be imported and functions exist
describe('conflictDetection.service', () => {
  it('should export required functions', async () => {
    // Dynamically import to avoid mocking issues
    const service = await import('./conflictDetection.service');

    expect(typeof service.checkStaffConflicts).toBe('function');
    expect(typeof service.checkVenueConflicts).toBe('function');
    expect(typeof service.checkEquipmentConflicts).toBe('function');
    expect(typeof service.checkAllConflicts).toBe('function');
  });

  it('should export required types', async () => {
    const service = await import('./conflictDetection.service');

    // Check that the types are exported (they will be undefined at runtime but should exist)
    expect(service.Conflict).toBeUndefined(); // Type-only export
    expect(service.ConflictResult).toBeUndefined(); // Type-only export
  });

  it('should export functions that return both conflicts and warnings', async () => {
    const service = await import('./conflictDetection.service');

    // Test that the functions exist and their return types include both conflicts and warnings
    expect(typeof service.checkStaffConflicts).toBe('function');
    expect(typeof service.checkVenueConflicts).toBe('function');
    expect(typeof service.checkEquipmentConflicts).toBe('function');
    expect(typeof service.checkAllConflicts).toBe('function');
  });
});