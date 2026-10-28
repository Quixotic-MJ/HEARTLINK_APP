import { isConnectionError } from '../offlineSave';

// The log saves keep an item on the phone only when the save never reached the server.

it('knows a lost connection from React Native and from Expo', () => {
  expect(isConnectionError(new TypeError('Network request failed'))).toBe(true);
  expect(isConnectionError(new Error('fetch failed: Failed to connect to /172.20.10.4:8000'))).toBe(true);
  expect(isConnectionError(new Error('fetch failed: The operation was aborted.'))).toBe(true);
  expect(isConnectionError(Object.assign(new Error('Aborted'), { name: 'AbortError' }))).toBe(true);
});

it('does not count a refused save or a bad reply as offline', () => {
  expect(isConnectionError(Object.assign(new Error('Server error: 422'), { status: 422 }))).toBe(false);
  expect(isConnectionError(new SyntaxError('Unexpected token < in JSON'))).toBe(false);
  expect(isConnectionError(null)).toBe(false);
});
