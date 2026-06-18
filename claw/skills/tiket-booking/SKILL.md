# Skill: Tiket.com Event Booking

## Purpose
Book event tickets (concerts, festivals, sports) on tiket.com.

## When to use
When the user asks to book event tickets on tiket.com, provides an event URL, or mentions buying tickets for concerts/events.

## Instructions

You are an expert at navigating tiket.com to purchase event tickets. Follow these steps:

### Step 1: Navigate to Event
- Go to the provided tiket.com event URL
- Wait for the page to fully load
- Identify available ticket categories/packages

### Step 2: Select Package
- Find the package matching the user's preference (e.g., "CAT 1 RIGHT", "Festival", "VIP")
- If the exact category isn't available, pick the closest match or the cheapest available
- Click to select it

### Step 3: Set Quantity
- Set the ticket quantity as requested
- Use + buttons or input field to increase quantity

### Step 4: Proceed to Order
- Click "Beli" or "Pesan" or equivalent button
- Navigate to the order/checkout page

### Step 5: Fill Booking Form
The order page has two sections:

**Detail Pemesan (Booker details):**
- Title: Tuan/Nyonya/Nona
- Nama lengkap
- Nomor ponsel (+62...)
- Alamat email
- Negara tempat tinggal

**Detail Pengunjung (Visitor details per ticket):**
For each pax/ticket:
- Title
- Nama lengkap
- Nomor Ponsel
- Email
- Nomor KTP

If "Sama dengan pemesan" checkbox is available and visitor data matches booker, check it.

### Step 6: Select Payment Method
- Navigate to payment selection
- Choose the user's preferred method (BCA Virtual Account, Credit Card, etc.)
- If BCA VA: select BCA Virtual Account, note the VA number
- If Credit Card: fill card details

### Step 7: Report Result
After reaching payment page, report back:
- Order ID
- Total amount
- Payment method selected
- VA number (if applicable)
- Payment deadline

## Important Rules
1. NEVER complete payment without user confirmation
2. ALWAYS report the total amount before proceeding to payment
3. If an OTP/verification is needed, PAUSE and ask the user
4. Take screenshots at key steps for audit
5. If a page element is not found, try scrolling or waiting longer
6. Handle popups and cookie banners by dismissing them
7. If tiket.com shows CAPTCHA, report to user and wait

## Input Expected
- event_url: URL of the event page on tiket.com
- ticket_category: which package/category to buy
- quantity: how many tickets
- booker_data: {title, full_name, phone, email, nationality}
- visitor_data: [{title, full_name, phone, email, id_number}] per pax
- payment_method: "bca_va" | "credit_card" | etc.
- payment_details: {card_number, expiry, cvv, name} (only if credit_card)

## Output Expected
- order_id: from tiket.com
- total_amount: IDR amount
- payment_info: VA number or CC confirmation
- payment_deadline: when to pay by
- screenshots: confirmation page screenshot
