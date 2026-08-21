// Closes the shared PGlite client after each test file so jest workers exit cleanly.
import { closeDb } from '@chokro/db';

afterAll(async () => {
  await closeDb();
});
