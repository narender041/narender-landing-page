# Urban Fruit Bowl — Inventory V1

A simple Stock In / Stock Out system built for Urban Fruit Bowl.

## Included
- Dashboard
- Stock In
- Stock Out
- Current stock calculation
- Quantity + pricing
- Weighted-average rate for Stock Out
- Low-stock status
- Admin + Store Person login roles
- Add Item from Dashboard (Admin only)
- Responsive phone/desktop UI
- Supabase/PostgreSQL backend
- Urban Fruit Bowl logo and brand colors

## Important
This version is intentionally limited to inventory. Recipes, automatic bowl consumption, wastage, suppliers, expenses and delivery are NOT included yet.

## Setup
1. Create a Supabase project.
2. Supabase -> SQL Editor -> run `supabase/schema.sql`.
3. Supabase -> Authentication -> Users -> create the first email/password user.
4. The trigger creates a profile automatically. Make the first user admin:

```sql
update public.profiles set role='admin' where email='YOUR_ADMIN_EMAIL';
```

5. Open `config.js` and enter your Supabase Project URL and anon/publishable key. Do not use service_role.
6. Upload the whole folder to GitHub.
7. Deploy the repository on Vercel (or any static hosting). No npm/build step is required.
8. Connect your existing domain.

## Test
- Add Apple, unit KG, minimum stock 10.
- Stock In: 50 KG at ₹140.
- Stock In: 50 KG at ₹160.
- Dashboard should show 100 KG and about ₹15,000 stock value.
- Stock Out: 10 KG.
- Dashboard should show 90 KG and about ₹13,500 stock value.

## Security
Only the Supabase anon/publishable key belongs in the browser. RLS is enabled. Stock writes happen through database functions, and stock cannot be manually overwritten.
