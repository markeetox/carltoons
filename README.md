import os
import subprocess
import time
from playwright.sync_api import sync_playwright

def verify_frontend():
    # 1. Start the dev server
    print("Starting dev server...")
    dev_server = subprocess.Popen(["npm", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(10)  # Wait for server to start

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            print("Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000")
            
            # Wait for the login screen to appear
            print("Waiting for LoginScreen...")
            page.wait_for_selector("text=CarlToons", timeout=10000)
            
            # Take a screenshot
            screenshot_path = "/home/jules/verification/login_screen.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
            
            browser.close()
    finally:
        dev_server.terminate()

if __name__ == "__main__":
    verify_frontend()
