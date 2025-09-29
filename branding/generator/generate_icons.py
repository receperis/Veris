#!/usr/bin/env python3
"""
Generate Chrome Extension Icons from SVG
Requires: pip install Pillow cairosvg
"""

import os
import sys
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("Missing dependencies. Please install:")
    print("pip install Pillow cairosvg")
    sys.exit(1)

def svg_to_png(svg_path, output_path, size):
    """Convert SVG to PNG at specified size"""
    try:
        # Convert SVG to PNG bytes
        png_bytes = cairosvg.svg2png(
            url=str(svg_path), 
            output_width=size, 
            output_height=size
        )
        
        # Open with PIL and save
        image = Image.open(io.BytesIO(png_bytes))
        image.save(output_path, 'PNG', optimize=True)
        print(f"✓ Generated {output_path} ({size}x{size})")
        
    except Exception as e:
        print(f"✗ Failed to generate {output_path}: {e}")

def main():
    # Get the directory of this script
    script_dir = Path(__file__).parent
    icons_dir = script_dir / "icons"
    
    # Source SVG file
    svg_file = icons_dir / "icon.svg"
    
    if not svg_file.exists():
        print(f"✗ SVG file not found: {svg_file}")
        return
    
    # Sizes needed for Chrome extension
    sizes = [
        (16, "icon16.png"),
        (32, "icon32.png"), 
        (48, "icon48.png"),
        (128, "icon128.png"),
        (256, "icon256.png"),  # For Chrome Web Store
        (440, "icon440.png"),  # For Chrome Web Store screenshot
    ]
    
    print("Generating Chrome Extension icons...")
    print(f"Source: {svg_file}")
    print()
    
    for size, filename in sizes:
        output_path = icons_dir / filename
        svg_to_png(svg_file, output_path, size)
    
    print()
    print("Icon generation complete!")
    print("\nManifest.json icon configuration:")
    print('"icons": {')
    print('  "16": "icons/icon16.png",')
    print('  "32": "icons/icon32.png",') 
    print('  "48": "icons/icon48.png",')
    print('  "128": "icons/icon128.png"')
    print('}')

if __name__ == "__main__":
    main()