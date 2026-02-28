import base64
import re
import sys

def fix_and_save(base64_str, output_path):
    # Remove prefix if exists
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    
    # Remove whitespace and invalid characters
    base64_str = re.sub(r'[^a-zA-Z0-9+/=]', '', base64_str)
    
    # Fix padding
    missing_padding = len(base64_str) % 4
    if missing_padding:
        base64_str += '=' * (4 - missing_padding)
    
    try:
        # If length is still 4n+1, it's structurally invalid.
        # But usually stripping brings it to a valid length or 4n+2 / 4n+3.
        # binascii specifically complains about 4n+1.
        if len(base64_str) % 4 == 1:
            base64_str = base64_str[:-1]
            
        decoded = base64.b64decode(base64_str)
        with open(output_path, 'wb') as f:
            f.write(decoded)
        print(f"Successfully saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_image.py <base64_string>")
    else:
        fix_and_save(sys.argv[1], "assets/buffalo_milk_v2.webp")
