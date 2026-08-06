import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await readFile(path.join(root, '..', 'app.json'), 'utf8'));
const expo = config.expo;
assert.equal(expo.scheme, 'ssw-wallet');
assert.match(expo.ios.bundleIdentifier, /^[a-z][a-z0-9.]+$/u);
assert.ok(expo.ios.associatedDomains.includes('applinks:wallet.sovereign.example'));
assert.ok(expo.android.intentFilters.some(filter => filter.action === 'VIEW' && filter.autoVerify));
assert.ok(expo.android.intentFilters.some(filter => filter.data.some(data => data.scheme === 'https')));
assert.ok(expo.plugins.includes('expo-secure-store'));
assert.ok(expo.plugins.includes('expo-camera'));
assert.ok(expo.plugins.includes('expo-linking'));
const serialized = JSON.stringify(config);
assert.doesNotMatch(serialized, /\b(?:ble|nfc)\b|pushNotification/iu);
console.log('Expo configuration valid: iOS/Android links, secure storage, camera, and linking configured.');
