import json

file_path = r"c:\Users\JOHN MARK MAGDASAL\OneDrive\Desktop\CTU main\CAPSTONE-2\backend\app\db\seed_content.json"
with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for r in data.get("exercise_routines", []):
    if r["id"] == "rout-601":
        r["requirements"] = ["Comfortable seated position", "Quiet environment"]
        r["calories"] = 15
        if len(r["steps"]) >= 4:
            r["steps"][0]["details"] = "Keep your spine straight and shoulders relaxed. Place hands on your knees."
            r["steps"][1]["details"] = "Breathe deep into your belly."
            r["steps"][2]["details"] = "Do not clamp your throat."
            r["steps"][3]["details"] = "Release the air slowly."
    elif r["id"] == "rout-602":
        r["requirements"] = ["Comfortable walking shoes", "Water bottle"]
        r["calories"] = 90
        if len(r["steps"]) >= 3:
            r["steps"][0]["details"] = "Loosen calves, hamstrings and shoulders for 1-2 minutes."
            r["steps"][1]["details"] = "You should be able to talk without getting out of breath."
            r["steps"][2]["details"] = "Gradually slow your steps over the final 2-3 minutes."
    elif r["id"] == "rout-603":
        r["requirements"] = ["Space to stand", "Comfortable clothing"]
        r["calories"] = 30
        if len(r["steps"]) >= 3:
            r["steps"][0]["details"] = "Stretch your spine upward."
            r["steps"][1]["details"] = "Keep your neck relaxed."
            r["steps"][2]["details"] = "Feel the stretch along your torso."
    elif r["id"] == "rout-604":
        r["requirements"] = ["Sturdy chair without wheels"]
        r["calories"] = 45
        if len(r["steps"]) >= 3:
            r["steps"][0]["details"] = "Keep your feet flat on the ground."
            r["steps"][1]["details"] = "Inhale as you arch your back, exhale as you round."
            r["steps"][2]["details"] = "Use the chair back for support if needed."
    elif r["id"] == "rout-605":
        r["requirements"] = ["Sturdy chair"]
        r["calories"] = 25
        if len(r["steps"]) >= 4:
            r["steps"][0]["details"] = "Sit up tall."
            r["steps"][1]["details"] = "Engage your thigh muscles."
            r["steps"][2]["details"] = "Keep the movement controlled."
            r["steps"][3]["details"] = "Maintain good posture."
    elif r["id"] == "rout-606":
        r["requirements"] = ["Quiet space"]
        r["calories"] = 10
        if len(r["steps"]) >= 3:
            r["steps"][0]["details"] = "Breathe deep into your diaphragm."
            r["steps"][1]["details"] = "Hold steady."
            r["steps"][2]["details"] = "Make a whooshing sound."
    elif r["id"] == "rout-607":
        r["requirements"] = ["Comfortable chair or mat"]
        r["calories"] = 10
        if len(r["steps"]) >= 3:
            r["steps"][0]["details"] = "Let your breathing return to normal."
            r["steps"][1]["details"] = "Scan your body for tension."
            r["steps"][2]["details"] = "Let thoughts pass like clouds."
    else:
        # Fallback for any other exercises that might be there
        r["requirements"] = []
        r["calories"] = 0
        for step in r.get("steps", []):
            step["details"] = "Follow the instructions carefully."

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Successfully updated seed_content.json with requirements, calories, and step details.")
