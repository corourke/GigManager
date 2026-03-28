-- Migration: Fix Fin Type Typo
-- Date: 2026-03-22
-- Description: Fixes the typo in 'Payment Received' enum value

ALTER TYPE public.fin_type RENAME VALUE 'Payment Recieved' TO 'Payment Received';
