import * as fs from 'node:fs/promises';
import { buildTools } from '@zooduck/build-tools';

await fs.rm('modules/@zooduck/simple-server', { recursive: true, force: true });
await fs.mkdir('modules/@zooduck/simple-server', { recursive: true });
await fs.cp('src/simpleServer.module.js', 'modules/@zooduck/simple-server/index.module.js');
await buildTools.removeCommentsFromFile('modules/@zooduck/simple-server/index.module.js');
