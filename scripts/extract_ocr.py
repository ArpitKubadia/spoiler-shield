import os
import json
import subprocess

def run_ocr(image_path):
    print(f"Running OCR on {image_path}...")
    try:
        result = subprocess.run(
            ["swift", "scripts/ocr.swift", image_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            ocr_data = []
            for line in lines:
                if not line:
                    continue
                try:
                    coords, text = line.split(':', 1)
                    x, y, w, h = map(float, coords.split(','))
                    ocr_data.append({
                        "text": text,
                        "x": x,
                        "y": y,
                        "w": w,
                        "h": h
                    })
                except Exception as e:
                    # Skips lines that don't match format
                    pass
            return ocr_data
        else:
            print(f"  OCR failed with code {result.returncode}: {result.stderr}")
            return None
    except Exception as e:
        print(f"  Exception running OCR: {e}")
        return None

def main():
    folder = "screenshots"
    results = {}
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".png") and not filename.startswith("._") and filename != "promo_tile.png":
            path = os.path.join(folder, filename)
            ocr_data = run_ocr(path)
            if ocr_data is not None:
                results[filename] = ocr_data
                
    out_path = os.path.join(folder, "ocr_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nDone! OCR results saved to {out_path}")

if __name__ == "__main__":
    main()
