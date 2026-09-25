import * as path from 'path';
import * as dotenv from 'dotenv';

// Fuerza el uso de la base de datos de pruebas (megaprojects_test), nunca la real.
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
