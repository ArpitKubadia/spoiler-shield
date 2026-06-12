import os
import sys
from PIL import Image

def analyze_image(path):
    print(f"Analyzing {path}...")
    try:
        img = Image.open(path)
        width, height = img.size
        mode = img.mode
        print(f"  Dimensions: {width}x{height}, Mode: {mode}")
        
        # Check if there is an alpha channel
        if 'A' in mode:
            # Find bounding box of non-transparent pixels
            # getbbox() returns (left, upper, right, lower)
            bbox = img.getbbox()
            if bbox:
                print(f"  Non-transparent BBox: {bbox} (width: {bbox[2]-bbox[0]}, height: {bbox[3]-bbox[1]})")
            else:
                print("  Image is completely transparent!")
        else:
            print("  No alpha channel (RGB/other).")
            
            # For RGB images, let's check if the edges are solid color (common in screenshots with backgrounds)
            # and do a quick heuristic analysis of the corners.
            pixels = img.load()
            corners = [pixels[0,0], pixels[width-1,0], pixels[0,height-1], pixels[width-1,height-1]]
            print(f"  Corner pixels: {corners}")
            
    except Exception as e:
        print(f"  Error: {e}")

def main():
    folder = "screenshots"
    for filename in sorted(os.listdir(folder)):
        if filename.endswith(".png"):
            analyze_image(os.path.join(folder, filename))

if __name__ == "__main__":
    main()
