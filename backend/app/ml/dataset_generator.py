import pandas as pd
import numpy as np
import random

def generate_dataset(num_samples=1000, output_path="dataset.csv"):
    np.random.seed(42)
    random.seed(42)
    
    data = []
    
    smoking_options = ["never", "former", "occasional", "daily"]
    sodium_options = ["rarely", "occasionally", "frequently"]
    
    for _ in range(num_samples):
        # Features
        smoking = random.choice(smoking_options)
        sleep = np.random.normal(7, 1.5)
        sleep = max(3.0, min(12.0, sleep))
        family_hist = random.choice([0, 1])
        sodium = random.choice(sodium_options)
        condition_count = random.randint(0, 3)
        medication = random.choice([0, 1]) if condition_count > 0 else 0
        resting_bp = np.random.normal(120, 15)
        max_hr = np.random.normal(170, 15)
        
        # Calculate Target (CSS) - Higher is better (max 100)
        score = 100
        
        if smoking == "daily":
            score -= 15
        elif smoking == "occasional" or smoking == "former":
            score -= 5
            
        score -= abs(8 - sleep) * 3
        score -= family_hist * 5
        
        if sodium == "frequently":
            score -= 10
        elif sodium == "occasionally":
            score -= 3
            
        score -= condition_count * 8
        if condition_count > 0 and medication == 1:
            score += 4 # Medication helps
            
        score -= abs(120 - resting_bp) * 0.5
        
        # Add some noise
        score += np.random.normal(0, 3)
        score = max(0, min(100, score)) # Clamp between 0 and 100
        
        data.append({
            "smoking_status": smoking,
            "avg_sleep_hours": round(sleep, 1),
            "family_history": family_hist,
            "sodium_frequency": sodium,
            "condition_count": condition_count,
            "on_medication": medication,
            "resting_bp_mmhg": round(resting_bp, 1),
            "max_heart_rate_bpm": round(max_hr, 1),
            "css_score": round(score)
        })
        
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Dataset generated at {output_path} with {num_samples} samples.")

if __name__ == "__main__":
    generate_dataset(1000, "dataset.csv")
