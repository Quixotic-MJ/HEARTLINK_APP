import requests
import json
import os

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Bounding box for Cebu City & Talisay City roughly (South, West, North, East)
overpass_query = """
[out:json];
(
  node["amenity"="hospital"](10.20, 123.80, 10.40, 123.95);
  node["amenity"="clinic"](10.20, 123.80, 10.40, 123.95);
);
out body;
"""

print("Fetching from OpenStreetMap Overpass API...")
response = requests.get(OVERPASS_URL, params={'data': overpass_query}, headers={'User-Agent': 'HeartLink/1.0'})
try:
    data = response.json()
except Exception as e:
    print(f"Failed to parse JSON. Raw response:\n{response.text}")
    exit(1)

clinics = []
start_id = 4 # existing 1, 2, 3

for element in data['elements']:
    tags = element.get('tags', {})
    name = tags.get('name')
    if not name:
        continue
        
    lat = element['lat']
    lon = element['lon']
    phone = tags.get('phone', '')
    
    clinics.append({
        "id": str(start_id),
        "name": name,
        "doctor": "Unassigned",
        "latitude": lat,
        "longitude": lon,
        "phone": phone,
        "specialty": "General Medicine"
    })
    start_id += 1

# Load seed file
seed_path = os.path.join(os.path.dirname(__file__), 'app', 'db', 'seed_content.json')

with open(seed_path, 'r', encoding='utf-8') as f:
    seed_data = json.load(f)

# Keep the original 3 and append the new ones (avoid duplicates by name)
existing_names = {c['name'].lower() for c in seed_data.get('clinics', [])}
added = 0

for c in clinics:
    if c['name'].lower() not in existing_names:
        seed_data.setdefault('clinics', []).append(c)
        added += 1

with open(seed_path, 'w', encoding='utf-8') as f:
    json.dump(seed_data, f, indent=2)

print(f"Successfully appended {added} new clinics/hospitals to seed_content.json!")
print(f"Total clinics available for seeding: {len(seed_data['clinics'])}")
