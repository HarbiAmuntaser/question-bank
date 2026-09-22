-- Commit the enum addition before using it as a default in the next migration.
ALTER TYPE "UserRole" ADD VALUE 'student';
