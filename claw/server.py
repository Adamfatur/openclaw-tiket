"""
Claw Container API Server
Receives booking tasks from the Go API and executes them via Playwright.
"""

import os
import asyncio
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

SLOT_NUMBER = int(os.environ.get("SLOT_NUMBER", "1"))
current_task: Optional[dict] = None
tasks_completed = 0


class BookingTask(BaseModel):
    booking_id: str
    event_url: str
    event_name: str = ""
    ticket_category: str = "Cheapest"
    quantity: int = 1
    notes: str = ""


@app.get("/health")
def health():
    return {
        "status": "ok",
        "slot": SLOT_NUMBER,
        "busy": current_task is not None,
    }


@app.get("/status")
def status():
    return {
        "current_task": current_task,
        "tasks_completed": tasks_completed,
        "slot": SLOT_NUMBER,
    }


@app.post("/task")
async def receive_task(task: BookingTask, background_tasks: BackgroundTasks):
    global current_task

    if current_task is not None:
        return {"error": "slot is busy", "status": "rejected"}

    current_task = task.model_dump()
    background_tasks.add_background_task(execute_task, task)

    return {"status": "accepted", "slot": SLOT_NUMBER, "booking_id": task.booking_id}


async def execute_task(task: BookingTask):
    global current_task, tasks_completed

    try:
        from skills.tiket_booking import handler
        await handler.execute_booking(task.model_dump())
    except Exception as e:
        import httpx
        callback_url = os.environ.get("API_CALLBACK_URL", "http://api:8080/internal/claw/callback")
        async with httpx.AsyncClient() as client:
            await client.post(callback_url, json={
                "booking_id": task.booking_id,
                "slot_number": SLOT_NUMBER,
                "status": "failed",
                "step": 0,
                "message": f"Execution error: {str(e)}",
            })
    finally:
        current_task = None
        tasks_completed += 1
