-- Remove o CHECK constraint de segment para permitir níveis
-- customizados (ex: "Infantil II", "Kingdom Kids") criados via import.
-- Idempotente.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = current_schema()
      AND constraint_name LIKE '%grade_levels%segment%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE grade_levels DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'grade_levels'
        AND tc.constraint_type = 'CHECK'
        AND tc.constraint_name LIKE '%segment%'
      LIMIT 1
    );
  END IF;
END $$;
