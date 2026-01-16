-- Insert default categories into categories table for existing users
-- Note: In a real multi-tenancy scenario, we might iterate users or rely on a trigger. 
-- For this individual user context, we will insert them for the currently authenticated user if possible, 
-- or generic if RLS allows. 
-- However, since this is a migration run, we can't easily target "current user".
-- Strategy: We'll create a function to seed categories for a given user, or just rely on the user manually creating them or the app doing it.
-- BETTER STRATEGY FOR THIS CONTEXT: We will insert the defaults with a hardcoded user_id OR 
-- we can insert them into a public/template table if we had one.
-- BUT, since the user complained the DB is empty, let's create a SQL script they can run in the SQL Editor 
-- or attempting to migratable way. 
-- PROBLEM: We don't have the user's ID in the migration.
-- ALTERNATIVE: Modify the app to check if categories are empty on load, and if so, seed them.
-- That is robust. Let's do that in `useFinanceData.ts`.
-- BUT for the migration artifact asked by user, I will create a SQL file that blindly inserts for ALL existing users? 
-- Or just create the categories unassigned? No, they require user_id.

-- Let's stick to the APP-SIDE SEEDING logic. It's safer. 
-- I will create a migration that just ENSURES the table exists (already done).

-- Wait, the `AddBudgetDialog` failure is likely because `categoryOptions` are hardcoded there but `useFinanceData` expects dynamic ones?
-- No, `useFinanceData` accepts string.
-- The issue is `AddBudgetDialog` has `categoryOptions` hardcoded.
-- If the user tries to create a budget, it sends a string like 'food'.
-- `addBudget` -> `supabase.from('budgets').insert(...)`
-- If `budgets` table has a foreign key to `categories`, that would fail if 'food' isn't in `categories` table.
-- Let's check the constraint in `budgets`.
-- I did NOT see a foreign key to `categories` in `budgets` in the previous `types.ts` view.
-- The schema I created for `categories` didn't enforce FK on `budgets` to `categories` yet? 
-- If I didn't add that constraint, inserts should work.
-- UNLESS the user implies "cannot create" because the dropdown is empty?
-- `AddBudgetDialog.tsx` uses a hardcoded list: `const categoryOptions ...`. So the dropdown IS NOT empty. The user CAN pick one.
-- So why "cannot create"?
-- "values total more than what is in the database" -> implies data syncing issues.

-- Let's update `AddBudgetDialog` to use dynamic categories FIRST.
-- And implement SEEDING in `useFinanceData` if empty.

-- I will create the seed migration script ANYWAY as an artifact for the user to optionally run, 
-- but I heavily suspect the app needs to handle the seeding because we don't know the User ID here.
-- actually, I can create a migration that iterates all users and inserts defaults.

DO $$
DECLARE
  user_rec record;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    INSERT INTO public.categories (name, type, user_id, icon, color)
    VALUES 
    ('Salario', 'income', user_rec.id, 'wallet', 'bg-emerald-500'),
    ('Otros ingresos', 'income', user_rec.id, 'coins', 'bg-emerald-400'),
    ('Alimentación', 'expense', user_rec.id, 'utensils', 'bg-orange-500'),
    ('Arriendo y mudanzas', 'expense', user_rec.id, 'home', 'bg-amber-700'),
    ('Aseo y limpieza', 'expense', user_rec.id, 'spray-can', 'bg-sky-400'),
    ('Cuidado personal y estética', 'expense', user_rec.id, 'sparkles', 'bg-rose-400'),
    ('Teléfono', 'expense', user_rec.id, 'smartphone', 'bg-blue-400'),
    ('Restaurantes', 'expense', user_rec.id, 'utensils-crossed', 'bg-orange-400'),
    ('Mecato y bebidas', 'expense', user_rec.id, 'coffee', 'bg-pink-500'),
    ('Educación', 'expense', user_rec.id, 'graduation-cap', 'bg-indigo-600'),
    ('Gym', 'expense', user_rec.id, 'dumbbell', 'bg-red-500'),
    ('Oficina y trabajo', 'expense', user_rec.id, 'briefcase', 'bg-slate-500'),
    ('Salidas, hospedajes y ocio', 'expense', user_rec.id, 'plane', 'bg-cyan-500'),
    ('Aplicativos, libros y gadgets', 'expense', user_rec.id, 'laptop', 'bg-violet-500'),
    ('Ropa, calzado y accesorios', 'expense', user_rec.id, 'shirt', 'bg-fuchsia-500'),
    ('Farmacia y Salud', 'expense', user_rec.id, 'pill', 'bg-red-400'),
    ('Salud y pensión', 'expense', user_rec.id, 'activity', 'bg-rose-500'),
    ('Seguro de vida', 'expense', user_rec.id, 'heart', 'bg-red-600'),
    ('Seguro moto', 'expense', user_rec.id, 'shield', 'bg-blue-600'),
    ('Civica', 'expense', user_rec.id, 'bus', 'bg-blue-700'),
    ('Transporte', 'expense', user_rec.id, 'car', 'bg-blue-500'),
    ('Gasolina', 'expense', user_rec.id, 'fuel', 'bg-yellow-600'),
    ('Parqueadero', 'expense', user_rec.id, 'parking-circle', 'bg-slate-400'),
    ('Moto', 'expense', user_rec.id, 'bike', 'bg-neutral-700'),
    ('Regalos', 'expense', user_rec.id, 'gift', 'bg-pink-400'),
    ('Utilería hogar y decoración', 'expense', user_rec.id, 'sofa', 'bg-orange-800'),
    ('Utilería oficina', 'expense', user_rec.id, 'paperclip', 'bg-slate-600'),
    ('Documentos y papelería', 'expense', user_rec.id, 'file-text', 'bg-zinc-400'),
    ('Grandes activos', 'expense', user_rec.id, 'gem', 'bg-indigo-900'),
    ('Reparaciones', 'expense', user_rec.id, 'wrench', 'bg-orange-900'),
    ('Préstamos', 'expense', user_rec.id, 'banknote', 'bg-red-700'),
    ('Impuestos y multas', 'expense', user_rec.id, 'building-2', 'bg-stone-600'),
    ('Ahorro', 'savings', user_rec.id, 'piggy-bank', 'bg-emerald-600'),
    ('CDT', 'savings', user_rec.id, 'landmark', 'bg-purple-600'),
    ('Acciones', 'investment', user_rec.id, 'trending-up', 'bg-indigo-500'),
    ('Otro', 'other', user_rec.id, 'help-circle', 'bg-gray-500')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
