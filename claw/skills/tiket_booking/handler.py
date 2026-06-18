"""
Tiket.com Event Booking Handler
Uses Playwright for browser automation + Bedrock Haiku for intelligent page analysis.
"""

import os
import json
import base64
import httpx
import asyncio
from playwright.async_api import async_playwright

API_CALLBACK_URL = os.environ.get("API_CALLBACK_URL", "http://api:8080/internal/claw/callback")
SLOT_NUMBER = int(os.environ.get("SLOT_NUMBER", "1"))
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-3")
BEDROCK_MODEL = os.environ.get("BEDROCK_MODEL", "anthropic.claude-haiku-4-5-20251001-v1:0")


async def report(booking_id: str, status: str, step: int, message: str, result: dict = None):
    """Send progress callback to API."""
    payload = {
        "booking_id": booking_id,
        "slot_number": SLOT_NUMBER,
        "status": status,
        "step": step,
        "message": message,
    }
    if result:
        payload["result"] = result

    async with httpx.AsyncClient() as client:
        try:
            await client.post(API_CALLBACK_URL, json=payload, timeout=10)
        except Exception as e:
            print(f"[claw-{SLOT_NUMBER}] callback error: {e}")


def ask_bedrock(prompt: str, image_b64: str = None) -> str:
    """Call Bedrock Claude Haiku for intelligent analysis."""
    import boto3

    client = boto3.client("bedrock-runtime", region_name=AWS_REGION)

    messages = [{"role": "user", "content": []}]

    if image_b64:
        messages[0]["content"].append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": image_b64}
        })

    messages[0]["content"].append({"type": "text", "text": prompt})

    response = client.invoke_model(
        modelId=BEDROCK_MODEL,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2048,
            "messages": messages,
            "temperature": 0.2,
        }),
        contentType="application/json",
    )

    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


async def execute_booking(task: dict):
    """Main booking execution."""
    booking_id = task["booking_id"]
    event_url = task["event_url"]
    ticket_category = task.get("ticket_category", "Cheapest")
    quantity = task.get("quantity", 1)
    notes = task.get("notes", "")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            locale="id-ID",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            # Step 1: Navigate to event
            await report(booking_id, "in_progress", 1, "Membuka halaman event...")
            await page.goto(event_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)

            # Step 2: Screenshot + analyze page with Bedrock
            await report(booking_id, "in_progress", 2, "Menganalisis halaman event...")
            screenshot = await page.screenshot()
            img_b64 = base64.b64encode(screenshot).decode()

            analysis = ask_bedrock(
                f"""Analyze this tiket.com event page screenshot. I need to book tickets.
                Target category: {ticket_category}
                Quantity: {quantity}
                Notes: {notes}
                
                Tell me:
                1. What ticket categories/packages are visible?
                2. Which selector should I click to select "{ticket_category}"?
                3. Is there a quantity selector? How to increase it?
                4. What's the "select/buy" button text and approximate location?
                
                Reply in JSON format:
                {{"packages": ["name1", "name2"], "target_selector_hint": "...", "buy_button_hint": "...", "has_quantity_selector": true}}""",
                img_b64
            )
            print(f"[claw-{SLOT_NUMBER}] Bedrock analysis: {analysis[:200]}")

            # Step 3: Navigate to packages page
            await report(booking_id, "in_progress", 3, f"Mencari paket: {ticket_category}")
            
            # Try packages URL
            packages_url = event_url.rstrip("/") + "/packages"
            await page.goto(packages_url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)

            # Step 4: Find and click target category
            await report(booking_id, "in_progress", 4, f"Memilih kategori {ticket_category}...")
            
            # Try multiple selectors for the ticket category
            clicked = False
            selectors_to_try = [
                f"text='{ticket_category}'",
                f"button:has-text('{ticket_category}')",
                f"div:has-text('{ticket_category}') >> button",
                f"[data-testid*='ticket']:has-text('{ticket_category}')",
            ]

            for sel in selectors_to_try:
                try:
                    elem = await page.wait_for_selector(sel, timeout=3000)
                    if elem:
                        await elem.click()
                        clicked = True
                        break
                except:
                    continue

            if not clicked:
                # Fallback: use Bedrock to find the right element
                screenshot2 = await page.screenshot()
                img_b64_2 = base64.b64encode(screenshot2).decode()
                hint = ask_bedrock(
                    f"I'm on the packages page. I need to select '{ticket_category}'. "
                    f"What text should I look for to click? Give me the exact button text visible on page. "
                    f"Reply with just the text string, nothing else.",
                    img_b64_2
                )
                try:
                    elem = await page.click(f"text='{hint.strip()}'", timeout=5000)
                    clicked = True
                except:
                    pass

            await page.wait_for_timeout(2000)

            # Step 5: Set quantity
            if quantity > 1:
                await report(booking_id, "in_progress", 5, f"Mengatur jumlah: {quantity} tiket")
                for _ in range(quantity - 1):
                    try:
                        plus = await page.query_selector("button:has-text('+'), [data-testid*='plus'], .qty-plus")
                        if plus:
                            await plus.click()
                            await page.wait_for_timeout(500)
                    except:
                        break

            # Step 6: Screenshot summary before proceeding
            await report(booking_id, "in_progress", 6, "Mengambil ringkasan pesanan...")
            summary_shot = await page.screenshot()
            summary_b64 = base64.b64encode(summary_shot).decode()

            # Use Bedrock to extract price info
            price_info = ask_bedrock(
                "Extract the ticket price information from this page. "
                "Reply in JSON: {\"category\": \"...\", \"price_per_ticket\": \"...\", \"total\": \"...\", \"quantity\": N}",
                summary_b64
            )
            print(f"[claw-{SLOT_NUMBER}] Price info: {price_info[:150]}")

            # Step 7: Pause for user confirmation
            await report(
                booking_id, "awaiting_confirmation", 7,
                f"Tiket ditemukan. {ticket_category} x{quantity}. Menunggu konfirmasi pembayaran..."
            )

            # Wait for user to confirm (poll API)
            confirmed = await wait_for_confirmation(booking_id, timeout=300)
            if not confirmed:
                await report(booking_id, "failed", 8, "Timeout: tidak ada konfirmasi dalam 5 menit")
                return

            # Step 8: Proceed to order page
            await report(booking_id, "confirmed", 8, "Dikonfirmasi. Melanjutkan ke halaman pemesanan...")
            
            # Click buy/order button
            buy_selectors = [
                "button:has-text('Beli')",
                "button:has-text('Pesan')",
                "button:has-text('Book')",
                "button:has-text('Lanjutkan')",
                "a:has-text('Beli')",
                "[data-testid*='buy']",
                "[data-testid*='order']",
            ]
            for sel in buy_selectors:
                try:
                    btn = await page.wait_for_selector(sel, timeout=3000)
                    if btn:
                        await btn.click()
                        break
                except:
                    continue

            await page.wait_for_timeout(5000)

            # Step 9: Final screenshot
            await report(booking_id, "in_progress", 9, "Halaman order terbuka. Siap isi data...")
            final_shot = await page.screenshot(path=f"/tmp/booking-{booking_id}-order.png")

            # Step 10: Report completion with order page info
            await report(
                booking_id, "completed", 10,
                "Booking sampai halaman order. Silakan selesaikan pembayaran.",
                result={
                    "booking_code": f"CLW-{booking_id[:8].upper()}",
                    "ticket_category": ticket_category,
                    "quantity": quantity,
                    "status_detail": "Order page reached. Payment pending.",
                    "screenshot": f"/tmp/booking-{booking_id}-order.png",
                }
            )

        except Exception as e:
            print(f"[claw-{SLOT_NUMBER}] Error: {e}")
            await report(booking_id, "failed", 0, f"Error: {str(e)[:200]}")
        finally:
            await browser.close()


async def wait_for_confirmation(booking_id: str, timeout: int = 300) -> bool:
    """Poll API for booking confirmation."""
    async with httpx.AsyncClient() as client:
        elapsed = 0
        while elapsed < timeout:
            await asyncio.sleep(5)
            elapsed += 5
            try:
                resp = await client.get(
                    f"http://api:8080/internal/booking/{booking_id}/status",
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "confirmed":
                        return True
                    if data.get("status") in ("cancelled", "failed"):
                        return False
            except:
                continue
    return False
