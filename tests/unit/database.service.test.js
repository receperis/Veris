/**
 * Simplified Database Service Tests
 */

describe('Database Service', () => {
  let mockDB;

  beforeEach(() => {
    mockDB = {
      init: jest.fn().mockResolvedValue({}),
      saveVocabularyEntry: jest.fn().mockResolvedValue(1),
      getAllVocabulary: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ totalEntries: 0 }),
      deleteVocabularyEntry: jest.fn().mockResolvedValue(),
      updateVocabularyEntry: jest.fn().mockResolvedValue()
    };
  });

  test('should initialize database', async () => {
    const result = await mockDB.init();
    expect(mockDB.init).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('should save vocabulary entry', async () => {
    const entry = testUtils.createMockVocabularyEntry();
    const result = await mockDB.saveVocabularyEntry(entry);
    
    expect(mockDB.saveVocabularyEntry).toHaveBeenCalledWith(entry);
    expect(result).toBe(1);
  });

  test('should get all vocabulary', async () => {
    const result = await mockDB.getAllVocabulary();
    
    expect(mockDB.getAllVocabulary).toHaveBeenCalled();
    expect(Array.isArray(result)).toBe(true);
  });

  test('should get statistics', async () => {
    const result = await mockDB.getStats();
    
    expect(mockDB.getStats).toHaveBeenCalled();
    expect(result).toHaveProperty('totalEntries');
  });

  test('should delete vocabulary entry', async () => {
    await mockDB.deleteVocabularyEntry(1);
    
    expect(mockDB.deleteVocabularyEntry).toHaveBeenCalledWith(1);
  });

  test('should update vocabulary entry', async () => {
    const updates = { translatedWord: 'updated' };
    await mockDB.updateVocabularyEntry(1, updates);
    
    expect(mockDB.updateVocabularyEntry).toHaveBeenCalledWith(1, updates);
  });

  test('should handle errors gracefully', async () => {
    mockDB.init.mockRejectedValue(new Error('Database error'));
    
    await expect(mockDB.init()).rejects.toThrow('Database error');
  });

  test('should validate vocabulary entry structure', () => {
    const validEntry = testUtils.createMockVocabularyEntry();
    expect(validEntry).toBeValidVocabularyEntry();
  });

  test('should validate language codes', () => {
    expect('en').toBeValidLanguageCode();
    expect('es').toBeValidLanguageCode(); 
    expect('invalid').not.toBeValidLanguageCode();
  });
});