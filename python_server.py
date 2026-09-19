#!/usr/bin/env python3
"""
PlanWise AI - Standalone Python Microservice
Antigravity Framework Paradigm

Exposes endpoints:
- POST /adjust-schedule: Intelligently redistributes missed study blocks into buffer hours
- POST /generate-schedule: Calculates priority and generates 1-2h blocks with 15% buffer
- GET  /health: Microservice health check
"""

import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from scheduler import generate_weekly_schedule, adjust_missed_schedule, calculate_priority


class PlanWiseRequestHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path in ["/health", "/api/health"]:
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "status": "healthy",
                "service": "PlanWise AI Python Scheduler",
                "framework": "Antigravity Lightweight Runner"
            }).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception as e:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}).encode("utf-8"))
            return

        if self.path in ["/adjust-schedule", "/api/adjust-schedule"]:
            missed_task_id = body.get("missedTaskId")
            tasks = body.get("tasks", [])
            user = body.get("user", {"studyHoursPerDay": 5, "peakEnergyTime": "Morning"})

            if not missed_task_id:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "missedTaskId is required"}).encode("utf-8"))
                return

            result = adjust_missed_schedule(tasks, missed_task_id, user)
            self._set_headers(200)
            self.wfile.write(json.dumps(result).encode("utf-8"))

        elif self.path in ["/generate-schedule", "/api/schedule/generate"]:
            user = body.get("user", {"studyHoursPerDay": 5, "peakEnergyTime": "Morning"})
            subjects = body.get("subjects", [])
            tasks = generate_weekly_schedule(user, subjects)
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "tasks": tasks, "count": len(tasks)}).encode("utf-8"))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Unknown POST route"}).encode("utf-8"))


def run_server(port=8080):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, PlanWiseRequestHandler)
    print(f"PlanWise AI Python Microservice listening on http://0.0.0.0:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Python server.")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)
