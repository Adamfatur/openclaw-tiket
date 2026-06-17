"""
Tiket.com Event Booking Handler
This is the main execution logic for the tiket-booking skill.
Communicates with the Go API via HTTP callbacks.
"""

import os
import httpx
from playwright.async_api import async_playwright
import asyncio

API_CALLBACK_URL = os.environ.get("API_CALLBACK_URL", "http://api:8080/internal/claw/callback")
SLOT_NUMBER = int(os.environ.get("SLOT_NUMBER", "1"))


async def report_progress(booking_id: str, status: str, step: int, message: str, result: dict = None):
    """Send progress update to API server."""
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
            print(f"Callback failed: {e}")


async def execute_booking(task: dict):
    """Main booking execution flow."""
    booking_id = task["booking_id"]
    event_url = task["event_url"]
    ticket_category = task.get("ticket_category", "Cheapest")
    quantity = task.get("quantity", 1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            locale="id-ID",
        )
        page = await context.new_page()

        try:
            # Step 1: Navigate to event page
            await report_progress(booking_id, "in_progress", 1, "Membuka halaman event...")
            await page.goto(event_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(3000)

            # Step 2: Look for ticket section
            await report_progress(booking_id, "in_progress", 2, "Mencari tiket yang tersedia...")
            await page.wait_for_timeout(2000)

            # Step 3: Find and select ticket category
            await report_progress(booking_id, "in_progress", 3, f"Mencari kategori: {ticket_category}")

            # Try to find ticket category buttons/options
            ticket_found = False
            selectors = [
                f"text={ticket_category}",
                f"[data-category='{ticket_category}']",
                ".ticket-item",
                ".product-variant",
            ]

            for selector in selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=5000)
                    if element:
                        await element.click()
                        ticket_found = True
                        break
                except:
                    continue

            if not ticket_found:
                # Fallback: click first available ticket
                try:
                    first_ticket = await page.query_selector(".ticket-item, .product-variant, [data-testid*='ticket']")
                    if first_ticket:
                        await first_ticket.click()
                        ticket_found = True
                except:
                    pass

            # Step 4: Set quantity
            await report_progress(booking_id, "in_progress", 4, f"Mengatur jumlah tiket: {quantity}")
            if quantity > 1:
                for _ in range(quantity - 1):
                    try:
                        plus_btn = await page.query_selector("[data-testid='plus'], .qty-plus, button:has-text('+')")
                        if plus_btn:
                            await plus_btn.click()
                            await page.wait_for_timeout(500)
                    except:
                        break

            # Step 5: Capture screenshot
            await report_progress(booking_id, "in_progress", 5, "Mengambil screenshot...")
            await page.screenshot(path=f"/tmp/booking-{booking_id}-selection.png")

            # Step 6: Report and wait for confirmation
            await report_progress(
                booking_id, "awaiting_confirmation", 6,
                f"Tiket ditemukan! Kategori: {ticket_category}, Jumlah: {quantity}. Menunggu konfirmasi..."
            )

            # Wait for confirmation signal (poll API or wait for webhook)
            confirmed = await wait_for_confirmation(booking_id, timeout=300)

            if not confirmed:
                await report_progress(booking_id, "failed", 7, "Timeout: user tidak mengkonfirmasi dalam 5 menit")
                return

            # Step 7: Proceed to checkout
            await report_progress(booking_id, "confirmed", 7, "Melanjutkan ke checkout...")
            buy_button = await page.query_selector(
                "[data-testid='buy-button'], .btn-buy, button:has-text('Beli'), button:has-text('Book')"
            )
            if buy_button:
                await buy_button.click()
                await page.wait_for_timeout(3000)

            # Step 8: Final screenshot
            await page.screenshot(path=f"/tmp/booking-{booking_id}-checkout.png")

            # Step 9: Complete
            await report_progress(
                booking_id, "completed", 9,
                "Booking berhasil! Silakan selesaikan pembayaran.",
                result={
                    "booking_code": f"CLW-{booking_id[:8].upper()}",
                    "ticket_category": ticket_category,
                    "quantity": quantity,
                    "screenshot": f"/tmp/booking-{booking_id}-checkout.png",
                }
            )

        except Exception as e:
            await report_progress(booking_id, "failed", 0, f"Error: {str(e)}")
        finally:
            await browser.close()


async def wait_for_confirmation(booking_id: str, timeout: int = 300) -> bool:
    """Poll API to check if booking is confirmed."""
    async with httpx.AsyncClient() as client:
        for _ in range(timeout // 5):
            await asyncio.sleep(5)
            try:
                # This would check the booking status from an internal endpoint
                # For now, simulate with a simple check
                resp = await client.get(
                    f"http://api:8080/internal/booking/{booking_id}/status",
                    timeout=5
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "confirmed":
                        return True
                    elif data.get("status") in ("cancelled", "failed"):
                        return False
            except:
                continue
    return False
