-- HL-165 (panel revision): the Cardiologist approves a case before it can be used as a dataset. A complete case (the
-- Cardiologist's review, plus the Dietitian's and PT's checks when they had anything to check) waits until a verified
-- Cardiologist approves it or leaves it out with a reason. The clinical dataset export only takes approved cases. If a
-- review part changes afterwards, the case goes back to waiting. Feedback to the patient is unchanged.
-- Additive and safe to re-run; existing cases start as 'waiting', so nothing enters the dataset without approval.
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS dataset_status text NOT NULL DEFAULT 'waiting';
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS dataset_note text;
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS dataset_decided_at timestamptz;
ALTER TABLE public.review_cases ADD COLUMN IF NOT EXISTS dataset_decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_cases_dataset_status_check') THEN
        ALTER TABLE public.review_cases
            ADD CONSTRAINT review_cases_dataset_status_check
            CHECK (dataset_status IN ('waiting', 'approved', 'left_out'));
    END IF;
END $$;

COMMENT ON COLUMN public.review_cases.dataset_status IS 'HL-165: waiting / approved / left_out by a verified Cardiologist, for the clinical dataset';
COMMENT ON COLUMN public.review_cases.dataset_note IS 'HL-165: why the Cardiologist left the case out (or an approval note)';
