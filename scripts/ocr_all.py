import os
import subprocess

def main():
    folder = "screenshots"
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".png") and not filename.startswith("._"):
            path = os.path.join(folder, filename)
            print(f"\n=== {filename} ===")
            try:
                # Run the Swift script as a subprocess
                result = subprocess.run(
                    ["swift", "scripts/ocr.swift", path],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    print(f"Total recognized text lines: {len(lines)}")
                    for line in lines[:25]:  # Print first 25 OCR hits
                        print(f"  {line}")
                else:
                    print(f"Error executing OCR: {result.stderr}")
            except Exception as e:
                print(f"Failed to run OCR for {filename}: {e}")

if __name__ == "__main__":
    main()
