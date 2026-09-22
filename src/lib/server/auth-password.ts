import "server-only";
import bcrypt from "bcryptjs";

const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
export function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export function comparePassword(password: string, hash?: string) { return bcrypt.compare(password, hash ?? DUMMY_HASH); }
