I will investigate why the `upsert` operation is failing in the `settings` table and fix the "Salão" fallback issue in the sidebar.

### Analysis
- The user is still getting "Erro ao salvar algumas configurações".
- The `upsert` in `Settings.tsx` uses `{ onConflict: 'owner_id,key' }`. I need to verify if there is actually a unique constraint or index on `(owner_id, key)` in the `settings` table. If not, `upsert` will fail or behave unexpectedly.
- The sidebar shows "Salão" because `businessName` and `userName` are likely empty or failing to load correctly from the prioritized sources.
- The `settings` table schema check showed that `owner_id` is a UUID.

### Proposed Changes

#### 1. Database Constraint Check & Fix
- Check if a unique constraint exists on `public.settings(owner_id, key)`.
- If missing, I will create a migration to add this unique constraint, which is required for the `upsert` functionality to work correctly in Supabase.

#### 2. Robust Settings Saving
- Update `src/components/admin/Settings.tsx` to handle the saving process more gracefully. If `upsert` continues to be an issue, I'll implement a "check then update or insert" logic as a fallback, though a unique constraint + upsert is the professional standard.

#### 3. Sidebar UI Fallback
- Improve the logic in `src/routes/admin.tsx` to ensure that if `businessName` is empty, it tries every available source (Tenant Business Name, Tenant Username, etc.) before falling back to a generic string.

### Technical Details
- **Migration:** Add `UNIQUE(owner_id, key)` to `public.settings`.
- **File:** `src/components/admin/Settings.tsx`
  - Refine the `handleSave` error logging to be even more specific if possible.
- **File:** `src/routes/admin.tsx`
  - Adjust `refreshIdentity` to be more resilient.
