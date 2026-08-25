-- backend/supabase/seed/recipes.sql
-- Seed Global Heart-Healthy Recipes Library

INSERT INTO public.recipes (
    id, legacy_id, name, subtitle, category, hss_tier, sodium_mg, calories, saturated_fat_g, cholesterol_mg, fiber_g,
    prep_time_minutes, servings, difficulty, heart_benefit, tags, ingredients, steps, image_url, status, expert_validated, created_at
)
VALUES
(
    'r5010000-0000-0000-0000-000000000501',
    'rec-501',
    'Low Sodium Chicken Tinola',
    'Traditional Filipino ginger broth soup tuned for heart health optimization',
    'Lunch',
    'Stable',
    380,
    320,
    1.5,
    65,
    4,
    35,
    4,
    'Easy',
    'Lowers cellular fluid retention via deliberate reduction of industrial sodium extracts.',
    ARRAY['Low Sodium', 'Filipino', 'Soup'],
    '[
        {"name": "Chicken breast, cut into serving pieces", "amount": 500, "unit": "g"},
        {"name": "Fresh ginger, julienned", "amount": 5, "unit": "slices"},
        {"name": "Chayote (sayote), peeled and sliced", "amount": 2, "unit": "medium"},
        {"name": "Moringa (malunggay) or chili leaves", "amount": 1, "unit": "cup"},
        {"name": "Garlic, crushed", "amount": 3, "unit": "cloves"},
        {"name": "Onion, chopped", "amount": 1, "unit": "medium"},
        {"name": "Water or low-sodium chicken broth", "amount": 1000, "unit": "ml"},
        {"name": "Fish sauce (low-sodium variant)", "amount": 1, "unit": "tbsp"}
    ]'::jsonb,
    ARRAY[
        'In a large pot, heat 1 tablespoon of olive oil over medium heat. Sauté garlic, onion, and ginger until fragrant.',
        'Add the chicken pieces. Sauté for 5-7 minutes until lightly browned.',
        'Pour in 1000ml water/broth. Simmer for 25-30 minutes until chicken is tender.',
        'Add sliced chayote and cook for 5 minutes.',
        'Season with low-sodium fish sauce and black pepper.',
        'Add malunggay leaves, turn off heat, cover for 2 minutes, and serve hot.'
    ],
    'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',
    'published',
    true,
    '2026-05-01T10:00:00Z'
),
(
    'r5020000-0000-0000-0000-000000000502',
    'rec-502',
    'Heart-Healthy Salmon Bowl',
    'Rich in omega-3 fatty acids for cardiovascular support',
    'Dinner',
    'Stable',
    280,
    450,
    2.0,
    55,
    6,
    25,
    2,
    'Medium',
    'High in Omega-3 to help reduce inflammation and lower blood pressure.',
    ARRAY['Omega-3', 'Seafood', 'Dinner'],
    '[
        {"name": "Fresh salmon fillet", "amount": 300, "unit": "g"},
        {"name": "Quinoa, rinsed", "amount": 1, "unit": "cup"},
        {"name": "Broccoli florets", "amount": 2, "unit": "cups"},
        {"name": "Cherry tomatoes, halved", "amount": 1, "unit": "cup"},
        {"name": "Lemon juice", "amount": 2, "unit": "tbsp"},
        {"name": "Extra virgin olive oil", "amount": 1, "unit": "tbsp"}
    ]'::jsonb,
    ARRAY[
        'Preheat oven to 400°F (200°C). Place salmon on parchment-lined baking sheet and brush with olive oil.',
        'Bake salmon for 12-15 minutes until it flakes easily with a fork.',
        'Cook rinsed quinoa in 2 cups water for 15 minutes.',
        'Steam broccoli florets for 5 minutes.',
        'Assemble bowl with quinoa, salmon, steamed broccoli, and cherry tomatoes. Drizzle with lemon juice.'
    ],
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    'published',
    true,
    '2026-06-01T10:00:00Z'
),
(
    'r5030000-0000-0000-0000-000000000503',
    'rec-503',
    'Oatmeal with Berries',
    'High-fiber breakfast to manage cholesterol levels',
    'Breakfast',
    'Stable',
    10,
    250,
    0.5,
    0,
    8,
    10,
    1,
    'Easy',
    'Soluble fiber in oats helps lower LDL cholesterol.',
    ARRAY['High Fiber', 'Breakfast', 'Vegan'],
    '[
        {"name": "Rolled oats", "amount": 0.5, "unit": "cup"},
        {"name": "Mixed berries", "amount": 0.5, "unit": "cup"},
        {"name": "Unsweetened almond milk", "amount": 1, "unit": "cup"},
        {"name": "Chia seeds", "amount": 1, "unit": "tbsp"},
        {"name": "Cinnamon powder", "amount": 0.5, "unit": "tsp"}
    ]'::jsonb,
    ARRAY[
        'Combine rolled oats and almond milk in saucepan; simmer 5-7 minutes.',
        'Stir in chia seeds and cinnamon powder.',
        'Transfer to bowl and top with fresh mixed berries.'
    ],
    'https://images.unsplash.com/photo-1517881917430-e70dfb3610aa?w=400&h=300&fit=crop',
    'published',
    true,
    '2026-06-10T08:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
