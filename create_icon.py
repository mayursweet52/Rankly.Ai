# =========================================================
# Rankly.ai - Create Custom Icon (Python Script)
# =========================================================
# This script creates a simple Rankly.ai icon
# Usage: python create_icon.py

from PIL import Image, ImageDraw, ImageFont
import os

def create_rankly_icon(filename="rankly-icon.ico"):
    """Create a custom Rankly.ai icon"""
    
    # Create a new image with gradient background
    size = (256, 256)
    image = Image.new('RGBA', size, (99, 102, 241, 255))  # Indigo background
    
    draw = ImageDraw.Draw(image)
    
    # Draw a circle for the background
    circle_bbox = [(20, 20), (236, 236)]
    draw.ellipse(circle_bbox, fill=(79, 70, 229, 255), outline=(255, 255, 255, 100), width=3)
    
    # Draw "R" letter in white
    try:
        # Try to use a large font
        font = ImageFont.truetype("arial.ttf", 120)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Draw text centered
    text = "R"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save as .ico
    image.save(filename, 'ICO', sizes=[256])
    print(f"✓ Icon created successfully: {filename}")
    return filename

if __name__ == "__main__":
    try:
        create_rankly_icon()
    except ImportError:
        print("ERROR: Pillow library not found.")
        print("Install it with: pip install Pillow")
    except Exception as e:
        print(f"ERROR: {e}")

