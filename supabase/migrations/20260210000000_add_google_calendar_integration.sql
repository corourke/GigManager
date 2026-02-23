-- Add Google Calendar Integration Tables
-- This migration creates the necessary tables for Google Calendar integration:
-- 1. user_google_calendar_settings - Stores user OAuth tokens and calendar preferences
-- 2. gig_sync_status - Tracks sync status of gigs to Google Calendar

-- Create enum for sync status
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed');

-- Table to store user's Google Calendar integration settings
CREATE TABLE user_google_calendar_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    access_token TEXT NOT NULL, -- Encrypted OAuth access token
    refresh_token TEXT NOT NULL, -- Encrypted OAuth refresh token
    token_expires_at TIMESTAMPTZ NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    sync_filters JSONB DEFAULT '{}'::jsonb, -- Optional filters (status, organization, etc.)
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Ensure one calendar per user
    UNIQUE(user_id, calendar_id)
);

-- Table to track sync status of gigs to Google Calendar
CREATE TABLE gig_sync_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_event_id TEXT,
    last_synced_at TIMESTAMPTZ,
    sync_status sync_status DEFAULT 'pending' NOT NULL,
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Ensure one sync record per gig per user
    UNIQUE(gig_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_google_calendar_settings_user_id ON user_google_calendar_settings(user_id);
CREATE INDEX idx_gig_sync_status_gig_id ON gig_sync_status(gig_id);
CREATE INDEX idx_gig_sync_status_user_id ON gig_sync_status(user_id);
CREATE INDEX idx_gig_sync_status_sync_status ON gig_sync_status(sync_status);

-- Add RLS policies
ALTER TABLE user_google_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_sync_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calendar settings
CREATE POLICY "Users can view own calendar settings" ON user_google_calendar_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar settings" ON user_google_calendar_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar settings" ON user_google_calendar_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar settings" ON user_google_calendar_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only see sync status for gigs they have access to
CREATE POLICY "Users can view gig sync status" ON gig_sync_status
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM gigs g
            WHERE g.id = gig_sync_status.gig_id
            AND (
                g.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN gig_participants gp ON gp.organization_id = om.organization_id
                    WHERE gp.gig_id = g.id AND om.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert gig sync status" ON gig_sync_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update gig sync status" ON gig_sync_status
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete gig sync status" ON gig_sync_status
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_google_calendar_settings_updated_at
    BEFORE UPDATE ON user_google_calendar_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gig_sync_status_updated_at
    BEFORE UPDATE ON gig_sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();