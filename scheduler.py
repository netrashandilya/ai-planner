#!/usr/bin/env python3
"""
PlanWise AI - Core AI Scheduling Engine & Dynamic Adjustment Logic
Hackathon Edition - Antigravity Framework Paradigm

Features:
- Connects to Firebase Firestore via Firebase Admin SDK (with fallback mock/CLI bridge).
- Calculates subject priority: (Difficulty * 10) / Days_Remaining_Until_Exam.
- Generates 1 to 2-hour study blocks across the upcoming week (7 days).
- Allocates high-difficulty subjects into user's designated Peak Energy Window (Morning / Afternoon / Night).
- Enforces a 15% reserved buffer of free time for cognitive recovery and dynamic reallocation.
- Dynamic Adjustment Logic (/adjust-schedule): Intelligently redistributes missed hours into open buffer blocks without overlapping.
"""

import sys
import os
import json
import argparse
import datetime
import math
import uuid
from typing import Dict, List, Any, Optional, Tuple

# Optional Firebase Admin SDK integration
FIREBASE_ADMIN_AVAILABLE = False
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_ADMIN_AVAILABLE = True
except ImportError:
    FIREBASE_ADMIN_AVAILABLE = False


def init_firebase_admin(service_account_path: Optional[str] = None, database_id: Optional[str] = None):
    """Initializes Firebase Admin SDK if credentials and library exist."""
    if not FIREBASE_ADMIN_AVAILABLE:
        return None
    try:
        if not firebase_admin._apps:
            if service_account_path and os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                # Attempt default application credentials
                firebase_admin.initialize_app()
        if database_id and database_id != "(default)":
            return firestore.client(database=database_id)
        return firestore.client()
    except Exception as e:
        sys.stderr.write(f"[Warning] Firebase Admin initialization bypassed: {e}\n")
        return None


def fetch_user_and_subjects_from_firestore(db, user_id: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Step 3 Requirement: Fetches user constraints and subjects from Firestore using the Firebase Admin SDK.
    """
    user = {"uid": user_id, "studyHoursPerDay": 5.0, "peakEnergyTime": "Morning"}
    subjects = []

    if db is None:
        return user, subjects

    try:
        # Fetch user preferences
        user_doc = db.collection("users").document(user_id).get()
        if user_doc.exists:
            user.update(user_doc.to_dict())

        # Fetch subjects associated with this user
        subs_stream = db.collection("subjects").where("userId", "==", user_id).stream()
        for doc in subs_stream:
            data = doc.to_dict()
            data["id"] = doc.id
            subjects.append(data)
    except Exception as e:
        sys.stderr.write(f"[Warning] Firestore fetch error: {e}\n")

    return user, subjects


def save_tasks_to_firestore(db, tasks: List[Dict[str, Any]]) -> bool:
    """
    Step 3 Requirement: Writes generated study blocks back to the `tasks` Firestore collection.
    """
    if db is None or not tasks:
        return False
    try:
        batch = db.batch()
        for task in tasks:
            task_ref = db.collection("tasks").document(task["id"])
            batch.set(task_ref, task, merge=True)
        batch.commit()
        return True
    except Exception as e:
        sys.stderr.write(f"[Warning] Firestore task write error: {e}\n")
        return False


# ---------------------------------------------------------------------------
# CORE ALGORITHM MATHEMATICS & TIME LOGIC
# ---------------------------------------------------------------------------

PEAK_ENERGY_WINDOWS = {
    "Morning": {
        "start_hour": 8,
        "end_hour": 12,
        "name": "Morning (08:00 - 12:00)"
    },
    "Afternoon": {
        "start_hour": 13,
        "end_hour": 17,
        "name": "Afternoon (13:00 - 17:00)"
    },
    "Night": {
        "start_hour": 19,
        "end_hour": 23,
        "name": "Night (19:00 - 23:00)"
    }
}

SECONDARY_WINDOWS = {
    "Morning": [{"start": 14, "end": 18}, {"start": 19, "end": 22}],
    "Afternoon": [{"start": 8, "end": 12}, {"start": 19, "end": 22}],
    "Night": [{"start": 9, "end": 13}, {"start": 14, "end": 18}]
}


def calculate_priority(difficulty: float, exam_date_str: str, current_date: datetime.date) -> float:
    """
    Calculates priority using required hackathon formula:
    Priority = (Difficulty * 10) / Days_Remaining_Until_Exam
    """
    try:
        exam_date = datetime.datetime.strptime(exam_date_str, "%Y-%m-%d").date()
    except Exception:
        # Fallback to 14 days if date parsing fails
        exam_date = current_date + datetime.timedelta(days=14)

    days_remaining = (exam_date - current_date).days
    # Prevent division by zero or negative days for imminent exams
    days_remaining = max(1, days_remaining)

    priority = (float(difficulty) * 10.0) / float(days_remaining)
    return round(priority, 2)


def generate_weekly_schedule(
    user: Dict[str, Any],
    subjects: List[Dict[str, Any]],
    start_date: Optional[datetime.date] = None
) -> List[Dict[str, Any]]:
    """
    Generates study blocks for the upcoming 7 days:
    - 1-hour to 2-hour blocks
    - 15% buffer time reserved (unallocated for breaks and rescheduling)
    - High-difficulty subjects scheduled during user's Peak Energy Time
    """
    if start_date is None:
        start_date = datetime.date.today()

    study_hours_per_day = float(user.get("studyHoursPerDay", 4.0))
    peak_energy_time = user.get("peakEnergyTime", "Morning")
    user_id = user.get("uid") or user.get("id", "default_user")

    if not subjects:
        return []

    # 1. Calculate Priority for each subject
    evaluated_subjects = []
    for sub in subjects:
        diff = float(sub.get("difficulty", 5))
        exam_date = sub.get("examDate", (start_date + datetime.timedelta(days=14)).isoformat())
        p_score = calculate_priority(diff, exam_date, start_date)
        evaluated_subjects.append({
            **sub,
            "difficulty": diff,
            "priority": p_score
        })

    # Sort descending by priority score, then by difficulty
    evaluated_subjects.sort(key=lambda s: (s["priority"], s["difficulty"]), reverse=True)

    # 2. Daily Time Constraints
    # Required: Leave a 15% buffer of free time in the schedule
    effective_study_hours = study_hours_per_day * 0.85
    buffer_hours = study_hours_per_day * 0.15

    peak_config = PEAK_ENERGY_WINDOWS.get(peak_energy_time, PEAK_ENERGY_WINDOWS["Morning"])
    peak_start = peak_config["start_hour"]
    peak_end = peak_config["end_hour"]
    peak_window_len = peak_end - peak_start

    secondary_slots = SECONDARY_WINDOWS.get(peak_energy_time, SECONDARY_WINDOWS["Morning"])

    generated_tasks: List[Dict[str, Any]] = []

    # 3. Schedule across 7 Days
    for day_offset in range(7):
        target_date = start_date + datetime.timedelta(days=day_offset)
        date_str = target_date.strftime("%Y-%m-%d")

        # Track occupied time ranges for the day to avoid overlaps
        occupied_slots: List[Tuple[float, float]] = []
        hours_scheduled_today = 0.0

        # Cycle through subjects weighted by priority
        # High difficulty (>= 7) or top priority gets peak energy slots
        for idx, subject in enumerate(evaluated_subjects):
            if hours_scheduled_today >= effective_study_hours:
                break

            # Block duration: 1 to 2 hours
            # Higher difficulty gets 2-hour blocks; lower difficulty gets 1 or 1.5-hour blocks
            if subject["difficulty"] >= 7:
                block_duration = 2.0
            elif subject["difficulty"] >= 4:
                block_duration = 1.5
            else:
                block_duration = 1.0

            # Cap to remaining daily allowance
            remaining_today = effective_study_hours - hours_scheduled_today
            if remaining_today < 1.0:
                break
            if block_duration > remaining_today:
                block_duration = math.floor(remaining_today) or 1.0

            is_high_difficulty = subject["difficulty"] >= 7 or idx == 0
            is_peak = False
            slot_found = None

            # Attempt Peak Energy Window first for High Difficulty
            if is_high_difficulty:
                curr_slot = float(peak_start)
                while curr_slot + block_duration <= peak_end:
                    overlap = any(not (curr_slot + block_duration <= s[0] or curr_slot >= s[1]) for s in occupied_slots)
                    if not overlap:
                        slot_found = (curr_slot, curr_slot + block_duration)
                        is_peak = True
                        break
                    curr_slot += 0.5

            # Fallback to secondary windows or remaining day slots
            if not slot_found:
                for sec in secondary_slots:
                    s_start = float(sec["start"])
                    s_end = float(sec["end"])
                    curr_slot = s_start
                    while curr_slot + block_duration <= s_end:
                        overlap = any(not (curr_slot + block_duration <= s[0] or curr_slot >= s[1]) for s in occupied_slots)
                        if not overlap:
                            slot_found = (curr_slot, curr_slot + block_duration)
                            is_peak = (curr_slot >= peak_start and curr_slot + block_duration <= peak_end)
                            break
                        curr_slot += 0.5
                    if slot_found:
                        break

            # If still not placed, check general daylight hours (09:00 - 21:00)
            if not slot_found:
                curr_slot = 9.0
                while curr_slot + block_duration <= 21.0:
                    overlap = any(not (curr_slot + block_duration <= s[0] or curr_slot >= s[1]) for s in occupied_slots)
                    if not overlap:
                        slot_found = (curr_slot, curr_slot + block_duration)
                        break
                    curr_slot += 0.5

            if slot_found:
                occupied_slots.append(slot_found)
                hours_scheduled_today += block_duration

                start_h = int(slot_found[0])
                start_m = int((slot_found[0] - start_h) * 60)
                end_h = int(slot_found[1])
                end_m = int((slot_found[1] - end_h) * 60)

                start_dt = datetime.datetime.combine(target_date, datetime.time(start_h, start_m))
                end_dt = datetime.datetime.combine(target_date, datetime.time(end_h, end_m))

                task_id = f"task_{date_str}_{subject['id'][:8]}_{int(slot_found[0])}"
                task_item = {
                    "id": task_id,
                    "userId": user_id,
                    "subjectId": subject["id"],
                    "subjectName": subject.get("name", "Study Topic"),
                    "startTime": start_dt.isoformat(),
                    "endTime": end_dt.isoformat(),
                    "durationHours": block_duration,
                    "date": date_str,
                    "status": "scheduled",
                    "isPeakEnergy": is_peak,
                    "difficulty": subject["difficulty"],
                    "priorityScore": subject.get("priority", 1.0),
                    "notes": f"Focus session on high-yield exam preparation. Priority: {subject.get('priority', 1.0)}",
                    "createdAt": datetime.datetime.now().isoformat()
                }
                generated_tasks.append(task_item)

    # Sort tasks chronologically
    generated_tasks.sort(key=lambda t: t["startTime"])
    return generated_tasks


# ---------------------------------------------------------------------------
# DYNAMIC ADJUSTMENT LOGIC (/adjust-schedule)
# ---------------------------------------------------------------------------

def adjust_missed_schedule(
    existing_tasks: List[Dict[str, Any]],
    missed_task_id: str,
    user: Dict[str, Any],
    today: Optional[datetime.date] = None
) -> Dict[str, Any]:
    """
    Intelligently redistributes missed hours into the remaining free buffer blocks
    of the week without overlapping existing tasks.
    """
    if today is None:
        today = datetime.date.today()

    # Find the target task
    missed_task = None
    for t in existing_tasks:
        if t["id"] == missed_task_id:
            missed_task = t
            break

    if not missed_task:
        return {
            "success": False,
            "error": f"Task with ID {missed_task_id} not found",
            "tasks": existing_tasks
        }

    # Mark the task as missed
    missed_task["status"] = "missed"
    missed_task["updatedAt"] = datetime.datetime.now().isoformat()
    missed_hours = float(missed_task.get("durationHours", 1.5))
    subject_id = missed_task.get("subjectId")
    subject_name = missed_task.get("subjectName", "Subject")
    user_id = missed_task.get("userId", user.get("uid", "user"))
    peak_energy_time = user.get("peakEnergyTime", "Morning")

    # Map existing scheduled tasks by date to detect open slots
    tasks_by_date: Dict[str, List[Tuple[float, float]]] = {}
    for t in existing_tasks:
        if t["status"] in ["scheduled", "rescheduled"]:
            d = t["date"]
            try:
                st = datetime.datetime.fromisoformat(t["startTime"])
                et = datetime.datetime.fromisoformat(t["endTime"])
                s_h = st.hour + (st.minute / 60.0)
                e_h = et.hour + (et.minute / 60.0)
                if d not in tasks_by_date:
                    tasks_by_date[d] = []
                tasks_by_date[d].append((s_h, e_h))
            except Exception:
                pass

    # Search for available free buffer windows in the upcoming 6 days
    remaining_hours_to_place = missed_hours
    rescheduled_tasks: List[Dict[str, Any]] = []

    # Buffer recovery windows: typically late afternoon (17:00-19:00) or evening (20:00-22:00)
    candidate_windows = [
        {"start": 17.0, "end": 19.0},
        {"start": 19.5, "end": 22.0},
        {"start": 10.0, "end": 12.0},
        {"start": 14.0, "end": 16.0}
    ]

    for day_offset in range(1, 7):
        if remaining_hours_to_place <= 0:
            break

        cand_date = today + datetime.timedelta(days=day_offset)
        d_str = cand_date.strftime("%Y-%m-%d")
        occupied = tasks_by_date.get(d_str, [])

        chunk_hours = min(1.5, remaining_hours_to_place)

        for win in candidate_windows:
            if remaining_hours_to_place <= 0:
                break
            curr_slot = win["start"]
            while curr_slot + chunk_hours <= win["end"]:
                # Check for overlap with existing scheduled tasks
                overlap = any(not (curr_slot + chunk_hours <= s[0] or curr_slot >= s[1]) for s in occupied)
                if not overlap:
                    # Place rescheduled chunk
                    occupied.append((curr_slot, curr_slot + chunk_hours))
                    if d_str not in tasks_by_date:
                        tasks_by_date[d_str] = []
                    tasks_by_date[d_str].append((curr_slot, curr_slot + chunk_hours))

                    s_int_h = int(curr_slot)
                    s_int_m = int((curr_slot - s_int_h) * 60)
                    e_int_h = int(curr_slot + chunk_hours)
                    e_int_m = int(((curr_slot + chunk_hours) - e_int_h) * 60)

                    new_st = datetime.datetime.combine(cand_date, datetime.time(s_int_h, s_int_m))
                    new_et = datetime.datetime.combine(cand_date, datetime.time(e_int_h, e_int_m))

                    new_task_id = f"adj_{uuid.uuid4().hex[:8]}_{d_str}"
                    rescheduled_block = {
                        "id": new_task_id,
                        "userId": user_id,
                        "subjectId": subject_id,
                        "subjectName": f"{subject_name} (Recovery)",
                        "startTime": new_st.isoformat(),
                        "endTime": new_et.isoformat(),
                        "durationHours": chunk_hours,
                        "date": d_str,
                        "status": "scheduled",
                        "isPeakEnergy": False,
                        "difficulty": missed_task.get("difficulty", 5),
                        "priorityScore": missed_task.get("priorityScore", 1.0),
                        "notes": f"Redistributed from missed session on {missed_task.get('date')} into free buffer slot.",
                        "createdAt": datetime.datetime.now().isoformat(),
                        "updatedAt": datetime.datetime.now().isoformat()
                    }
                    rescheduled_tasks.append(rescheduled_block)
                    existing_tasks.append(rescheduled_block)
                    remaining_hours_to_place -= chunk_hours
                    break
                curr_slot += 0.5

    existing_tasks.sort(key=lambda t: t.get("startTime", ""))

    return {
        "success": True,
        "missedTaskId": missed_task_id,
        "missedHoursRedistributed": missed_hours - remaining_hours_to_place,
        "rescheduledTasksCount": len(rescheduled_tasks),
        "newTasks": rescheduled_tasks,
        "tasks": existing_tasks
    }


# ---------------------------------------------------------------------------
# CLI & FIREBASE SYNC ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PlanWise AI - Scheduling Engine")
    parser.add_argument("--action", choices=["generate", "adjust", "test"], default="test",
                        help="Action to perform: generate weekly schedule or adjust missed tasks")
    parser.add_argument("--payload", type=str, default="", help="JSON string payload with user and subjects")
    parser.add_argument("--service-account", type=str, default="", help="Path to Firebase service account JSON")
    parser.add_argument("--user-id", type=str, default="user_demo_01", help="Target user UID")

    args = parser.parse_args()

    # 1. Test Mode (Self-verifying dry run)
    if args.action == "test":
        test_user = {
            "uid": "user_planwise_test",
            "studyHoursPerDay": 5.0,
            "peakEnergyTime": "Morning"
        }
        test_subjects = [
            {"id": "sub_cs101", "name": "Algorithms & Data Structures", "examDate": (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d"), "difficulty": 9},
            {"id": "sub_math201", "name": "Linear Algebra", "examDate": (datetime.date.today() + datetime.timedelta(days=12)).strftime("%Y-%m-%d"), "difficulty": 8},
            {"id": "sub_phy100", "name": "Quantum Mechanics", "examDate": (datetime.date.today() + datetime.timedelta(days=20)).strftime("%Y-%m-%d"), "difficulty": 6},
            {"id": "sub_eng105", "name": "Technical Writing", "examDate": (datetime.date.today() + datetime.timedelta(days=30)).strftime("%Y-%m-%d"), "difficulty": 3}
        ]

        print("=== PlanWise AI: Testing Priority Calculation ===")
        for s in test_subjects:
            p = calculate_priority(s["difficulty"], s["examDate"], datetime.date.today())
            print(f"Subject: {s['name']:<30} | Diff: {s['difficulty']} | Exam: {s['examDate']} | Priority Score: {p:.2f}")

        print("\n=== PlanWise AI: Generating Weekly Schedule (15% buffer, Peak Energy Morning) ===")
        blocks = generate_weekly_schedule(test_user, test_subjects)
        print(f"Generated {len(blocks)} study blocks across upcoming week.")
        for b in blocks[:5]:
            print(f"[{b['date']}] {b['startTime'][11:16]}-{b['endTime'][11:16]} | {b['subjectName']} ({b['durationHours']}h) | Peak: {b['isPeakEnergy']}")

        print("\n=== PlanWise AI: Testing Dynamic Adjustment (/adjust-schedule) ===")
        first_id = blocks[0]["id"]
        adj_result = adjust_missed_schedule(blocks, first_id, test_user)
        print(f"Redistributed {adj_result['missedHoursRedistributed']} hours into {adj_result['rescheduledTasksCount']} buffer blocks.")
        for nb in adj_result['newTasks']:
            print(f"-> Rescheduled Block: [{nb['date']}] {nb['startTime'][11:16]}-{nb['endTime'][11:16]} | {nb['subjectName']}")
        print("\n[OK] PlanWise AI Engine verification complete.")
        return

    # Read input payload from argument or stdin
    payload_data = {}
    if args.payload:
        try:
            payload_data = json.loads(args.payload)
        except Exception as e:
            sys.stderr.write(f"Error parsing --payload: {e}\n")
    elif not sys.stdin.isatty():
        try:
            payload_data = json.load(sys.stdin)
        except Exception:
            pass

    if args.action == "generate":
        user = payload_data.get("user", {"uid": args.user_id, "studyHoursPerDay": 5, "peakEnergyTime": "Morning"})
        subjects = payload_data.get("subjects", [])
        schedule = generate_weekly_schedule(user, subjects)
        print(json.dumps({"success": True, "tasks": schedule, "count": len(schedule)}))

    elif args.action == "adjust":
        tasks = payload_data.get("tasks", [])
        missed_task_id = payload_data.get("missedTaskId", "")
        user = payload_data.get("user", {"uid": args.user_id, "studyHoursPerDay": 5, "peakEnergyTime": "Morning"})
        result = adjust_missed_schedule(tasks, missed_task_id, user)
        print(json.dumps(result))


if __name__ == "__main__":
    main()
